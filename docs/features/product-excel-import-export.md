# Product Excel Import and Export: Setup and Implementation Guide

**Status:** Backend and desktop client implemented; Railway deployment verification pending
**Environment:** Private beta
**Application hosting:** Railway
**Database:** MongoDB Atlas
**Queue:** BullMQ on Redis Cloud
**File storage:** Private Amazon S3 bucket

## 1. Purpose

This document is the end-to-end guide for setting up and implementing product Excel imports and exports. It records what has already been configured and describes the remaining application and deployment work.

The first release is intentionally bounded. It should reliably handle approximately 5,000 product rows without introducing architecture intended for 100,000-row workbooks.

## 2. Current status

### Completed

- The NestJS backend is deployed as a Railway service.
- MongoDB Atlas is configured and used by the backend.
- An AWS account and product-image S3 bucket already exist.
- A separate private S3 bucket was created for temporary product import and export files.
- S3 Block Public Access is enabled on the transfer bucket.
- The transfer bucket uses bucket-owner-enforced object ownership and default encryption.
- The transfer bucket has browser CORS configured for the approved frontend origin.
- A lifecycle rule expires transfer objects after seven days.
- Incomplete multipart uploads are removed after one day.
- IAM policies are named:
  - `ProductImageBucketAccess`
  - `ProductTransferBucketAccess`
- Both policies are attached to the IAM user whose credentials are configured in Railway.
- Railway already has its AWS credentials, AWS region, image bucket configuration, and transfer bucket configuration.
- The transfer bucket is configured in Railway as `S3_PRODUCT_TRANSFER_BUCKET`.
- A free Redis Cloud database was created for the private beta.
- Redis uses the `noeviction` policy required by BullMQ.
- The Redis connection URL is stored on the existing Railway backend service as `REDIS_URL`.
- The backend has BullMQ producer and worker modules.
- Product-transfer MongoDB job and staging schemas are implemented.
- Presigned S3 upload and download authorization is implemented.
- Workbook validation, staging, import application, error-report generation, and export generation are implemented.
- Product imports use the existing product and stock service boundaries with auditable, idempotent stock movements.
- GraphQL product-transfer operations are implemented.
- A separate NestJS worker entry point and production start command are implemented.
- Backend workbook and stock-import tests are implemented.
- Local integration tests passed against Redis Cloud, MongoDB Atlas, and the private S3 transfer bucket.
- A controlled background export, presigned upload, validation-only import, and confirmed stock import completed successfully.
- The Products data table has administrator-only desktop import and export actions.
- Dedicated import/export dialogs support upload, validation, confirmation, progress, results, and downloads.
- Active transfers can be minimized into a persistent Products-page transfer dock and restored after returning to the page.
- Completed imports refresh both remote product queries and the tenant IndexedDB snapshot.

### Not yet completed

- The new API build has not been deployed and verified inside Railway.
- A separate Railway worker service has not been created.
- The client workflow still requires visual browser verification against the deployed API and worker.

## 3. Final architecture

```text
Browser
  |
  | GraphQL requests, status polling, confirmation
  v
Railway API service
  |-- MongoDB Atlas: create and read authoritative job records
  |-- Redis Cloud: enqueue BullMQ jobs
  |-- Amazon S3: create presigned upload/download authorization
  |
  +---- presigned authorization ----> Browser

Browser
  |-- direct presigned upload ------> Amazon S3
  +-- direct signed download <------- Amazon S3

Redis Cloud
  | BullMQ job delivery
  v
Railway worker service
  |-- MongoDB Atlas: products, inventory, staged rows, progress
  |-- Amazon S3: source files, error reports, generated exports
  +-- Redis Cloud: retries, locks, and job completion
```

### Service responsibilities

| Component      | Responsibility                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Browser        | Select files, upload directly to S3, show progress, confirm imports, and download results                              |
| Railway API    | Authenticate users, authorize tenant/admin access, create job records, enqueue work, and issue signed S3 authorization |
| Redis Cloud    | Hold temporary BullMQ queue state, retries, locks, and stalled-job metadata                                            |
| Railway worker | Validate workbooks, apply imports, generate exports, and persist progress                                              |
| MongoDB Atlas  | Store products, inventory, authoritative transfer jobs, staged rows, checkpoints, and results                          |
| Amazon S3      | Store source workbooks, skipped-row reports, and generated exports                                                     |

MongoDB is the source of truth for user-visible state. Redis is not the permanent job database.

## 4. Security boundaries

- The browser must never receive MongoDB, Redis, or AWS credentials.
- The browser receives only short-lived, operation-specific S3 authorization.
- The transfer bucket remains private with Block Public Access enabled.
- Every API and worker operation is scoped to the authenticated tenant.
- Object keys are generated by the server and are never accepted as arbitrary client input.
- BullMQ payloads contain only opaque MongoDB transfer-job IDs.
- Workbook contents, personal data, AWS credentials, signed S3 URLs, and staged rows must not be stored in Redis job payloads.
- Railway variables hold secrets and must not be committed to the repository or logged.

### Private-beta Redis exception

The current free Redis Cloud database does not support TLS. Railway therefore reaches it through a public, non-TLS Redis endpoint. This is accepted only for the private beta.

Before a production release, replace it with one of the following:

1. A paid Redis Cloud Essentials database with TLS, persistence, and appropriate availability; or
2. Redis deployed within Railway's private network with persistence and monitoring.

After migration, rotate the Redis password and update `REDIS_URL`.

## 5. Initial operational limits

- Maximum product rows per workbook: **5,000**, excluding the header.
- Row 5,001 causes the workbook to be rejected.
- Maximum compressed upload size: **5 MiB**.
- Accepted format: `.xlsx` only.
- Required worksheet: exactly one worksheet named `Products`.
- One active product-transfer operation per tenant.
- Initial worker concurrency: one.
- Export fails before generation if the tenant has more than 5,000 active products.
- Partial exports are not produced.
- Source workbooks, error reports, and generated exports expire from S3 after seven days.
- Presigned upload authorization should expire after approximately 15 minutes.
- Signed download authorization should expire after approximately five minutes.

These limits should be constants or validated configuration with a tested hard ceiling. Raising them requires load and memory testing.

## 6. Workbook contract

The `Products` worksheet uses these columns:

| Product ID | Product Name | Price | Unit | Quantity |
| ---------- | ------------ | ----: | ---- | -------: |

### Column behavior

- **Product ID:** Optional for manually added rows and always included in exports. If supplied, it must identify an active product belonging to the current tenant.
- **Product Name:** Required. Used as a fallback identity when Product ID is blank.
- **Price:** Required when creating a product. It does not update an existing product in the first release.
- **Unit and Quantity:**
  - Both blank: no stock change.
  - Both populated: enable or reconcile stock.
  - Only one populated: skip the row as invalid.
- **Quantity:** Nonnegative decimal with at most six decimal places.

`Category` is not included because the current product model does not have that field.

### Product matching

1. Match by tenant-owned Product ID when provided.
2. Otherwise normalize and match Product Name.
3. If no match exists, create a product.
4. Skip ambiguous or duplicate matches.

Product-name normalization should apply Unicode NFKC normalization, trim outer whitespace, collapse internal whitespace, and compare case-insensitively.

### Inventory behavior

- Existing untracked product with Unit and Quantity: enable tracking and create an auditable opening movement.
- Existing tracked product with matching Unit: reconcile to the imported quantity.
- Existing tracked product with a different Unit: skip for manual resolution.
- Blank Unit and Quantity: leave stock tracking and quantity unchanged.
- Existing product name and price are not updated in the first release.

### Validation behavior

Fatal workbook errors reject the entire file:

- Unreadable or invalid XLSX file
- Incorrect or duplicate headers
- Additional worksheets
- Unsupported workbook structure
- File-size limit exceeded
- More than 5,000 data rows

Row-level errors skip only the affected rows:

- Invalid or missing values
- Invalid price or quantity
- Only one of Unit and Quantity populated
- Unit mismatch
- Unknown or cross-tenant Product ID
- Duplicate workbook identity
- Ambiguous normalized name

Validation completes before confirmation. The user sees create, update, unchanged, and skipped counts and can download a skipped-row report. If no eligible rows remain, the import cannot be confirmed.

## 7. S3 setup

### Bucket separation

Use separate buckets for permanent product images and temporary product-transfer files. This prevents the seven-day transfer lifecycle from deleting product images and keeps access and CORS policies independent.

### Object-key layout

```text
tenants/{tenantId}/product-imports/{jobId}/source.xlsx
tenants/{tenantId}/product-imports/{jobId}/errors.xlsx
tenants/{tenantId}/product-exports/{jobId}/products.xlsx
```

### Transfer-bucket CORS

The transfer bucket is configured with the approved frontend origin. The intended policy is equivalent to:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "POST"],
    "AllowedOrigins": ["https://your-frontend-domain.example"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Production must not use `*` for `AllowedOrigins`. Add `http://localhost:5173` only when local browser testing against this bucket is intentionally allowed.

### Transfer-bucket lifecycle

The dedicated bucket has a lifecycle rule named:

```text
ExpireProductTransferFilesAfter7Days
```

It applies to all objects in the dedicated transfer bucket and:

- Expires current objects after seven days.
- Aborts incomplete multipart uploads after one day.

S3 lifecycle expiration is asynchronous and may occur after the object becomes eligible rather than at the exact seven-day timestamp.

### IAM policy

The Railway IAM user has `ProductTransferBucketAccess`, equivalent to:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProductTransferObjectAccess",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_TRANSFER_BUCKET_NAME/*"
    },
    {
      "Sid": "ProductTransferBucketLocation",
      "Effect": "Allow",
      "Action": "s3:GetBucketLocation",
      "Resource": "arn:aws:s3:::YOUR_TRANSFER_BUCKET_NAME"
    }
  ]
}
```

Do not place real account IDs, access keys, secret keys, or passwords in this guide.

## 8. Redis Cloud and BullMQ setup

### Current Redis configuration

- Hosting: Redis Cloud free Essentials database
- Intended use: private beta only
- Eviction policy: `noeviction`
- Railway variable: `REDIS_URL`
- Queue data: job IDs and BullMQ operational state only

The Redis URL includes a password and must remain secret. Store only the URL portion, not the `redis-cli -u` command prefix.

### Queue design

Use one queue:

```text
product-transfer
```

Use these BullMQ job names:

```text
validate-import
apply-import
generate-export
```

Every payload contains only:

```ts
{
  transferJobId: string
}
```

Use deterministic BullMQ job IDs:

```text
validate-{transferJobId}
apply-{transferJobId}
export-{transferJobId}
```

Recommended initial behavior:

- Three attempts for transient infrastructure failures.
- Exponential backoff beginning at approximately five seconds.
- Worker concurrency of one.
- Remove successful BullMQ records after one day, subject to a count limit.
- Retain failed BullMQ records for up to seven days, subject to a count limit.
- Never use Redis job completion as the only record of business completion.
- Reconcile and re-enqueue eligible MongoDB jobs when the worker starts.

The API producer should fail quickly if Redis is unavailable. Worker Redis connections should wait and reconnect; with ioredis this requires `maxRetriesPerRequest: null`.

## 9. MongoDB job state

MongoDB stores an authoritative transfer job similar to:

```ts
type ProductTransferJob = {
  tenantId: string
  requestedBy: string
  type: 'IMPORT' | 'EXPORT'
  status: string
  inputKey?: string
  outputKey?: string
  errorKey?: string
  totalRows: number
  eligibleRows: number
  skippedRows: number
  validatedRows: number
  appliedRows: number
  createdCount: number
  updatedCount: number
  unchangedCount: number
  failureCode?: string
  failureMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  filesExpireAt?: Date
}
```

Suggested import statuses:

```text
AWAITING_UPLOAD
QUEUED_FOR_VALIDATION
VALIDATING
AWAITING_CONFIRMATION
QUEUED_FOR_IMPORT
IMPORTING
COMPLETED
COMPLETED_WITH_SKIPS
VALIDATION_FAILED
FAILED
CANCELLED
EXPIRED
```

Suggested export statuses:

```text
QUEUED
EXPORTING
COMPLETED
FAILED
EXPIRED
```

Staged rows need a unique index on transfer job ID and original worksheet row number. Temporary staged rows should have a cleanup policy independent of S3 lifecycle expiration.

## 10. Import workflow

### Upload and validation

1. The browser asks the API to create an import job.
2. The API verifies authenticated administrator and tenant access.
3. The API creates an `AWAITING_UPLOAD` MongoDB job and server-generated S3 key.
4. The API returns a presigned S3 POST valid for approximately 15 minutes.
5. The browser uploads directly to the private transfer bucket.
6. The browser asks the API to queue validation.
7. The API verifies the uploaded object before enqueueing.
8. The API adds `validate-import` to BullMQ with only the transfer job ID.
9. The worker downloads and validates the workbook.
10. The worker stages eligible rows, records skipped rows, and persists progress in MongoDB.
11. The worker generates an error workbook in S3 when rows are skipped.
12. The job enters `AWAITING_CONFIRMATION` when at least one row is eligible.

### Confirmation and application

1. The administrator reviews the summary and confirms.
2. The API atomically moves the job to `QUEUED_FOR_IMPORT`.
3. The API adds `apply-import` to BullMQ.
4. The worker applies staged rows through ProductService and StockService boundaries.
5. Each applied row or bounded batch is transactional and idempotent.
6. Progress and checkpoints are persisted in MongoDB.
7. Apply-time conflicts are recorded as skipped instead of silently changing product units or identities.
8. The job finishes as `COMPLETED` or `COMPLETED_WITH_SKIPS`.

### Inventory audit and idempotency

- Add an explicit spreadsheet-import movement reason/source to the stock domain.
- Record transfer job ID, worksheet row number, requesting user, and occurrence time.
- Use transfer job ID plus worksheet row as the idempotency identity.
- Duplicate BullMQ delivery must not create duplicate products or stock movements.
- Reconcile quantity using current stock at application time.
- A concurrent sale committed after reconciliation changes stock normally.
- Use MongoDB transactions and the existing stock revision/concurrency model.

## 11. Export workflow

1. The browser asks the API to create an export.
2. The API verifies administrator and tenant access.
3. The API counts active tenant products and fails clearly when the count exceeds 5,000.
4. The API creates the MongoDB export job and enqueues `generate-export`.
5. The worker reads active tenant products in stable, bounded pages.
6. The worker generates the validation-compatible `Products` worksheet.
7. The worker uploads the completed workbook to private S3.
8. The worker stores the output key and row count and marks the job completed.
9. The browser discovers completion by polling the API.
10. The browser asks the API for a short-lived signed GET URL.
11. The browser downloads directly from S3.

An export is not guaranteed to be a single point-in-time snapshot while sales or product edits continue. Prevent concurrent import/export operations for the same tenant, but do not add a long-running database snapshot transaction in the first release.

## 12. API surface

The GraphQL API needs operations equivalent to:

```text
createProductImportUpload
queueProductImportValidation
confirmProductImport
cancelProductImport
productTransferJob
activeProductTransferJob
latestProductTransferJob
createProductExport
createProductTransferDownloadUrl
```

All operations require authentication, tenant access, and administrator authorization. Tenant identity comes from the authenticated request, never from workbook data.

## 13. Backend implementation stages

Implement and verify one stage at a time.

### Stage 1: Configuration and dependencies

Add only the dependencies required by the implementation:

```text
@nestjs/bullmq
bullmq
ioredis
@aws-sdk/client-s3
@aws-sdk/s3-presigned-post
@aws-sdk/s3-request-presigner
exceljs
zod
```

Add runtime validation for:

```text
REDIS_URL
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_PRODUCT_TRANSFER_BUCKET
```

Do not log validated secret values.

### Stage 2: Redis and queue foundation

- Register BullMQ in NestJS.
- Register the `product-transfer` queue.
- Add API startup/health verification without exposing credentials.
- Add producer service methods with deterministic BullMQ job IDs.
- Verify one harmless job can be added and observed.

### Stage 3: S3 storage service

- Add an injected S3 client.
- Generate tenant-scoped server object keys.
- Create presigned POST upload authorization with file-size and key constraints.
- Verify uploaded objects before queueing.
- Upload generated files from the worker.
- Create five-minute signed GET URLs only for authorized completed jobs.

### Stage 4: MongoDB job and staging models

- Add product-transfer job schema and indexes.
- Add staged-row schema, unique job/row index, and cleanup policy.
- Implement valid state transitions atomically.
- Enforce one active transfer per tenant.

### Stage 5: Workbook validation

- Enforce file, worksheet, header, row, cell, and type limits.
- Reject formulas, formula-like executable values, merged data cells, and unsupported cell types.
- Match Product ID first and normalized name second.
- Stage eligible rows and report skipped rows.
- Generate an error workbook.

### Stage 6: Import application

- Add service-level import operations to ProductService and StockService.
- Add spreadsheet import movement metadata.
- Apply eligible rows in bounded work units.
- Make retries idempotent.
- Persist progress and resume from MongoDB state.

### Stage 7: Export generation

- Count before export and enforce the 5,000-row cap.
- Read products using stable bounded pagination.
- Generate the common workbook contract.
- Upload to S3 and expose completion through MongoDB.

### Stage 8: Worker entry point

- Add a Nest application-context worker bootstrap separate from the HTTP API.
- Register BullMQ processors only in the worker process.
- Handle `SIGTERM` and close workers gracefully for Railway deployments.
- Reconcile stale nonterminal MongoDB jobs during startup.

### Stage 9: GraphQL and client UI

- Add generated GraphQL contracts and typed client operations.
- Add catalog import/export secondary actions.
- Poll approximately every two seconds only while a job is active.
- Restore active or recent jobs after navigation and reload.
- Refresh the complete tenant IndexedDB product snapshot after successful import.

## 14. Railway deployment

### Existing API service

The API continues using its current production start command. It needs:

```text
MONGO_URI
REDIS_URL
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_PRODUCT_TRANSFER_BUCKET
```

It also retains API-only configuration such as JWT secrets and client origin.

### Future worker service

Create the worker service only after the worker entry point is implemented and tested.

1. Add a second persistent Railway service.
2. Connect it to the same repository and deployment branch.
3. Name it clearly, such as `oputech-sales-worker`.
4. Use the same backend build command.
5. Use a dedicated worker start command, planned as:

   ```text
   pnpm --filter @oputech/sales-server start:worker:prod
   ```

6. Do not assign a public domain.
7. Configure restart-on-failure.
8. Start with one replica and concurrency one.
9. Give it MongoDB, Redis, AWS, S3, and timezone variables, but not unnecessary JWT secrets.

### Atlas network access

The worker is a separate Railway service and may have different outbound addresses from the API.

- If Atlas currently allows all addresses, the worker can connect with the existing database credentials, though production should tighten this.
- If Atlas uses an IP allowlist, enable Railway static outbound IPs for the worker and add them to Atlas.
- Use a least-privilege database user where practical.

## 15. Testing and verification

### Infrastructure

- API can connect to Redis without logging the URL.
- Worker can connect to Redis and consume a harmless test job.
- API can create a constrained presigned upload.
- Browser can upload from the approved CORS origin.
- Worker can read the uploaded object.
- Worker can upload a generated object.
- API can create an authorized signed download.
- Unauthenticated and cross-tenant download attempts fail.
- Transfer objects become eligible for S3 lifecycle expiration.

### Workbook limits

- Valid imports with 1, 1,000, and 5,000 rows.
- Rejection of 5,001 rows.
- Rejection above 5 MiB.
- Export followed by re-import.
- Export rejection when active products exceed 5,000.

### Validation and domain behavior

- Blank, malformed, and formula-containing workbooks.
- Missing, duplicate, and unexpected headers.
- Negative, invalid, zero, and fractional quantities.
- Unicode product names and units.
- Duplicate and ambiguous names.
- Product ID tenant isolation.
- Existing untracked product enables inventory.
- Existing tracked product reconciles quantity.
- Unit mismatch is skipped and reported.
- Blank Unit and Quantity leave inventory unchanged.
- Valid rows apply while invalid rows remain skipped.

### Reliability

- Duplicate queue delivery does not duplicate products or movements.
- Worker shutdown and restart resumes safely.
- Redis loss followed by recovery re-enqueues eligible MongoDB jobs.
- Retry after unknown completion remains idempotent.
- Concurrent sale and inventory reconciliation preserve valid stock history.
- Browser closure does not cancel server-side processing.
- Progress survives reloads.

## 16. Monitoring and operations

- Log transfer job IDs, queue job IDs, phase, duration, counts, and sanitized failure codes.
- Never log workbook contents, Redis URLs, signed S3 URLs, tokens, or AWS credentials.
- Alert or surface jobs left nonterminal beyond an expected duration.
- Track Redis memory, connection count, and operation limits during the beta.
- Keep BullMQ completed/failed retention bounded to protect the 30 MB free database.
- Provide authorized manual retry for recoverable terminal failures.
- Show users when downloadable files have expired even if MongoDB job history remains.

## 17. Production-readiness checklist

Before promoting beyond private beta:

- [ ] Replace free non-TLS Redis with TLS-enabled Redis.
- [ ] Rotate Redis credentials and update Railway.
- [ ] Enable appropriate Redis persistence, availability, and monitoring.
- [ ] Verify `noeviction` after migration.
- [ ] Restrict Atlas network access to approved Railway egress.
- [ ] Review and rotate AWS credentials.
- [ ] Confirm S3 IAM permissions remain least-privilege.
- [ ] Confirm production frontend CORS origin and remove unnecessary localhost origins.
- [ ] Run 5,000-row import and export load tests in a production-like environment.
- [ ] Test worker restart, Redis outage, and duplicate-delivery recovery.
- [ ] Confirm lifecycle cleanup does not affect the product-image bucket.
- [ ] Document operator retry and incident procedures.

## 18. Recommended next action

Deploy the updated API and verify Redis/S3/Atlas connectivity in the private-beta environment. After that succeeds, create the Railway worker service with the implemented `start:worker:prod` command, verify a controlled import/export job, and then begin the client implementation.
