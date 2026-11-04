1. User picks an image in FE
2. FE calls BE to get a presigned PUT URL (short-lived, for upload only)
3. FE uploads the file directly to S3 using that URL — image never passes through your server
4. FE sends the S3 object key (e.g. inventory/abc123.jpg) to BE as part of the mutation
5. BE saves the key on the inventory item document

For displaying the image, two options:

- Public bucket — just construct the static URL from the key. Simplest for product images, no expiry concerns.
- Private bucket — BE generates a presigned GET URL on-demand when serving the item. More secure but adds latency.

For an inventory system, a public bucket scoped to the inventory/ prefix is usually the right call — product images don't need
to be secret.

On the separate images collection: Only worth it if an item can have multiple images or you need metadata (alt text, display
order). For a single product image, imageUrl: string on the inventory item is simpler and sufficient. You can always migrate
later if requirements change.

In short: presigned PUT for uploading + store the S3 key (or public URL) on the item + public bucket = simplest correct
approach. Want to wire this in when we get to the FE phase?
