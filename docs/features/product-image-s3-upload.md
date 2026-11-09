# Product Image S3 Upload

**Status:** Planned  
**Applies to:** `app/client`, `app/server`, AWS S3  
**Last reviewed:** 2026-11-09

## 1. Purpose

Move product image bytes out of GraphQL requests and upload them directly from the browser to Amazon S3.

The current client converts selected images to base64 data URLs and includes them in product mutations. Base64 adds approximately 33% overhead, while NestJS, Next.js, and upstream proxies can reject large request bodies before product-level validation runs. This produces HTTP `413 Payload Too Large` errors.

JavaScript does not impose a small fixed upload limit. The relevant constraints are browser memory and HTTP request limits configured by application servers and proxies.

S3 stores the uploaded bytes; it does not compress images automatically. Images will be resized and compressed in the browser before upload.

## 2. Scope and decisions

The first release will:

- Resize and compress selected images in the browser.
- Convert supported images to WebP.
- Limit the original file to approximately 20 MiB.
- Limit the compressed upload to 1 MiB.
- Limit the longest image dimension to 1,600 pixels while preserving aspect ratio.
- Upload image bytes directly from the browser to S3 using a short-lived presigned POST.
- Store the resulting public S3 URL in the existing product `imageUrl` field.
- Use tenant-scoped, randomly generated object keys.
- Keep existing base64 product images readable.
- Stop sending an unchanged existing image during product edits.
- Cache viewed S3 product images for offline use in a bounded service-worker cache.

The first release will not:

- Delete replaced, removed, or abandoned S3 objects.
- Detect orphaned S3 objects.
- Add S3 lifecycle cleanup rules.
- Migrate existing base64 images to S3.
- Process images with Lambda or another server-side image pipeline.
- Add CloudFront.

Old and abandoned image objects may therefore remain in S3 until cleanup is implemented separately.

## 3. System architecture

```text
Browser
  ├── Resize and compress the selected image to WebP
  ├── GraphQL: request a presigned S3 POST
  ├── POST the image binary directly to S3
  └── GraphQL: create or update the product with the public image URL

NestJS API
  ├── Authenticates the administrator and tenant
  ├── Generates a tenant-scoped object key
  ├── Creates a short-lived presigned POST policy
  ├── Optionally verifies the uploaded object with HeadObject
  └── Stores the public URL with the product

Amazon S3
  ├── Accepts uploads authorized by presigned POST policies
  └── Serves product images publicly from the approved prefix
```

Image bytes do not pass through Next.js, NestJS, GraphQL, or MongoDB for new uploads.

## 4. AWS bucket setup

Create a general-purpose S3 bucket with a globally unique name, for example:

```text
oputech-sales-product-images-<unique-suffix>
```

Recommended settings:

| Setting | Value |
| --- | --- |
| Region | `ap-southeast-1` unless the application is deployed elsewhere |
| Object Ownership | Bucket owner enforced; ACLs disabled |
| Versioning | Disabled initially |
| Default encryption | SSE-S3 |
| Static website hosting | Disabled |

Avoid periods in the bucket name. Use lowercase letters, numbers, and hyphens.

### 4.1 Public read policy

Only objects below `product-images/` should be publicly readable. Public uploads, deletion, and bucket listing must remain prohibited.

Keep public access through ACLs blocked. Allow the bucket policy to grant public reads, then add the following bucket policy after replacing `YOUR_BUCKET_NAME`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadProductImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/product-images/*"
    }
  ]
}
```

Account-level S3 Block Public Access settings can override the bucket policy and must be checked if public object requests return `403`.

### 4.2 CORS

Configure bucket CORS with the exact approved client origins and no trailing slashes:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "POST"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://YOUR-PRODUCTION-DOMAIN"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

CORS controls which browser origins may make cross-origin requests. It does not replace IAM or bucket policies.

## 5. Backend IAM permissions

The NestJS workload requires only the permissions needed to create uploads and verify uploaded objects:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadAndVerifyProductImages",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/product-images/*"
    }
  ]
}
```

`s3:DeleteObject` and `s3:ListBucket` are not required in the initial cleanup-free scope.

Production workloads running on AWS should use an IAM role and temporary credentials. Local development may use a named AWS CLI profile. Long-lived credentials must never be committed or exposed to the browser.

Example local profile setup:

```bash
aws configure --profile oputech-sales
aws sts get-caller-identity --profile oputech-sales
```

## 6. Application configuration

Server configuration:

```dotenv
AWS_REGION=ap-southeast-1
AWS_PROFILE=oputech-sales
S3_PRODUCT_IMAGE_BUCKET=YOUR_BUCKET_NAME
S3_PRODUCT_IMAGE_PUBLIC_URL=https://YOUR_BUCKET_NAME.s3.ap-southeast-1.amazonaws.com
```

`AWS_PROFILE` is for local development. A production IAM role does not require it.

Client configuration for offline image caching:

```dotenv
NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL=https://YOUR_BUCKET_NAME.s3.ap-southeast-1.amazonaws.com
```

The bucket name, region, and public URL are not secrets. AWS access keys, secret keys, and session tokens must never use a `NEXT_PUBLIC_` variable.

## 7. Upload authorization

Add server dependencies:

```text
@aws-sdk/client-s3
@aws-sdk/s3-presigned-post
```

Add an administrator-only, tenant-protected GraphQL mutation equivalent to:

```text
createProductImageUpload(input: ProductImageUploadInput!): ProductImageUpload!
```

The input contains the compressed file size and MIME type. The response contains:

```ts
type ProductImageUpload = {
  url: string;
  fields: Array<{ name: string; value: string }>;
  imageUrl: string;
};
```

The server generates an object key such as:

```text
product-images/{tenantId}/{uuid}.webp
```

The presigned POST must:

- Expire after approximately five minutes.
- Require the exact generated object key.
- Require `image/webp`.
- Enforce a content-length range from 1 byte to 1 MiB.
- Set `Cache-Control: public,max-age=31536000,immutable`.

Tenant identity comes from the authenticated request, never from client-provided object paths.

## 8. Client image processing and upload

Add `browser-image-compression` to the client.

The image dropzone will:

1. Accept JPEG, PNG, and WebP input.
2. Reject unsupported formats with a clear error.
3. Reject original files larger than approximately 20 MiB.
4. Resize while preserving aspect ratio.
5. Convert the result to WebP.
6. Target 1 MiB or less with a maximum dimension of 1,600 pixels.
7. Use `URL.createObjectURL()` for previews instead of base64.
8. Revoke preview object URLs when replaced or unmounted.

After processing, the client requests upload authorization, constructs `FormData` from every returned S3 field, appends the file last, and posts directly to S3:

```ts
const body = new FormData()

for (const field of fields) {
  body.append(field.name, field.value)
}

body.append('file', compressedImage)

await fetch(uploadUrl, {
  method: 'POST',
  body,
})
```

The browser must set the multipart boundary, so the client must not manually set the request `Content-Type` header.

## 9. Product create and edit behavior

### Create

1. Process the selected image locally.
2. Request a presigned POST.
3. Upload directly to S3.
4. Submit `createProduct` with the returned public `imageUrl`.

Creating a product without an image continues to work.

### Edit

- If the image is unchanged, omit `imageUrl` from the update input.
- If a new image is selected, upload it and send the new public URL.
- If the image is removed, send an empty value according to the existing product contract.

Omitting an unchanged image is required for backward compatibility: an existing base64 image must not be copied into every edit mutation and trigger another `413` response.

Compression and upload errors keep the modal open and display an actionable message. Submission remains disabled while compression, authorization, upload, or product mutation work is pending.

## 10. Server-side product validation

For new or changed image values, the server must:

- Parse the URL instead of relying on a loose string prefix check.
- Require the configured S3 public origin.
- Require a path below `product-images/{currentTenantId}/`.
- Reject another tenant's object path.
- Optionally use `HeadObject` to confirm that the object exists, is WebP, and is within the final size limit.

Existing stored base64 image values remain readable. New uploads must use the S3 flow.

The GraphQL JSON body limit should not be raised as the primary fix. Product mutations become small after image bytes move to S3.

## 11. Offline image behavior

Product metadata continues to be stored in IndexedDB. The service worker will additionally:

- Match only the configured S3 origin and `product-images/` path.
- Cache product image GET requests after they are viewed.
- Use cache-first behavior for matching images.
- Store images in a separate cache bounded to approximately 200 entries.
- Permit caching cross-origin opaque image responses when necessary.

The first release does not prefetch every image during catalog synchronization.

## 12. Failure behavior

- Compression failure: do not request an upload; show an image-processing error.
- Authorization failure: do not contact S3; preserve the selected image for retry.
- S3 upload failure: do not submit the product mutation; show an upload error.
- Product mutation failure after upload: preserve the form for retry. The uploaded object may remain unused.
- Expired presigned POST: request a new upload authorization and retry.
- Existing legacy image: render it normally and omit it from unrelated product edits.

Because cleanup is deferred, replacement, removal, product deletion, failed product mutations, and abandoned forms can leave objects in S3.

## 13. Testing

Automated and manual verification should cover:

- JPEG, PNG, and WebP source files.
- Unsupported formats and files over the original-size limit.
- Resizing while preserving aspect ratio.
- Final files at, below, and above 1 MiB.
- Presigned POST expiration, MIME, key, and size conditions.
- Admin authorization and tenant isolation.
- Rejection of foreign buckets, origins, and tenant paths.
- Successful direct upload followed by product creation.
- Product creation without an image.
- Product editing without resending an existing base64 image.
- Image replacement and removal behavior.
- Clear errors for compression, authorization, upload, and mutation failures.
- Rendering public S3 URLs in catalog and POS views.
- Offline rendering after an S3 image has entered the bounded cache.

Repository verification:

```bash
pnpm lint
pnpm test
pnpm build
```

The user performs final visual and browser verification.

## 14. Acceptance criteria

- New product image bytes never pass through GraphQL or MongoDB.
- Supported source images are resized, converted to WebP, and limited to 1 MiB before upload.
- Only authenticated administrators can request upload authorization.
- Generated object keys are random and scoped to the active tenant.
- S3 rejects uploads that violate the signed key, MIME, expiry, or size policy.
- Product mutations store only a short public S3 URL.
- Editing a product with an unchanged legacy image does not resend its base64 data.
- New S3 images render in catalog and POS views.
- Viewed S3 images can be served from the bounded offline cache.
- Existing base64 images continue to render.
- No request-body limit increase is needed to support new image uploads.

## 15. Deferred cleanup

Cleanup is explicitly out of scope for this implementation. A future feature may add:

- Explicit deletion after image replacement or removal.
- Deletion when a product is archived.
- A private `pending/` upload prefix and lifecycle expiration.
- Periodic orphan detection with dry-run support.
- S3 lifecycle rules and noncurrent-version expiration if versioning is enabled.

Until then, the bucket's storage usage should be monitored and an AWS Budget alert should be configured.

## 16. Manual S3 verification

Before application implementation, verify the bucket and IAM configuration with a small WebP image:

```bash
aws s3 cp ./test.webp \
  s3://YOUR_BUCKET_NAME/product-images/manual-test.webp \
  --content-type image/webp \
  --cache-control "public,max-age=31536000,immutable" \
  --profile oputech-sales
```

The following URL should return the image without authentication:

```text
https://YOUR_BUCKET_NAME.s3.ap-southeast-1.amazonaws.com/product-images/manual-test.webp
```

The bucket root should remain non-listable and normally return `403`.

Remove the test object afterward:

```bash
aws s3 rm \
  s3://YOUR_BUCKET_NAME/product-images/manual-test.webp \
  --profile oputech-sales
```

## 17. References

- [Blocking public access to Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [Configuring S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html)
- [AWS SDK for JavaScript presigned POST](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-presigned-post)
- [AWS IAM security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
