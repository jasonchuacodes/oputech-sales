# Product Excel Import and Export

**Status:** Planned; implementation deferred  
**Applies to:** `app/client`, `app/server`, worker infrastructure  
**Target capacity:** Up to 10,000 product rows per workbook  
**Last reviewed:** 2026-11-09

## 1. Purpose

Provide administrators with a reliable way to:

- Import products and inventory quantities from an Excel workbook.
- Create products that do not exist yet.
- Reconcile the quantity of products that already exist.
- Export every product belonging to the active tenant into an Excel workbook.
- Track validation and import/export progress without keeping the browser open.

Imports and exports are online-only administrative operations. They must not use the offline transaction outbox.

## 2. Scope and decisions

The first release will use the following behavior:

- Accept `.xlsx` workbooks only.
- Support a maximum of 10,000 product rows. Files over the limit are rejected.
- Run validation, import, and export work in background jobs.
- Store uploaded workbooks, generated exports, and error reports in private S3 storage.
- Match existing products by normalized product name.
- Update only inventory quantity when a row matches an existing product.
- Create a product when no matching product exists.
- Leave products that are absent from the workbook unchanged.
- Export all products for the active tenant, not only visible search results.
- Validate the complete workbook before changing products.
- Apply validated rows in resumable, idempotent batches.

This is an upsert workflow, not a complete catalog replacement.

## 3. Prerequisites

Implementation should begin after the unit and inventory work has established:

- The final product unit representation.
- Whether inventory quantity is an integer or decimal.
- Whether inventory uses a current-value field, an adjustment ledger, or both.
- The service boundary through which stock reconciliation must occur.
- The fields required to create a product.

The checked-in product client and server contracts must also be aligned before this feature is built. In particular, product pagination and fields such as category must have one shared contract.

## 4. Workbook contract

The workbook contains one worksheet named `Products`. The template and export functionality must generate the same format accepted by import.

| Product Name | Unit | Quantity | Price | Category |
| --- | --- | ---: | ---: | --- |
| Coca-Cola | bottle | 24 | 25.00 | Main |

### Column rules

- **Product Name:** Required text. Used to identify existing products after normalization.
- **Unit:** Required when creating a product. It does not change the unit of an existing matching product in the first release.
- **Quantity:** Required, numeric, and nonnegative. Its integer or decimal rules follow the inventory domain.
- **Price:** Required when creating a product unless the product model defines a safe default.
- **Category:** Optional only when the product model supplies a default, such as `Main`.

If the workbook is limited to Product Name, Unit, and Quantity, it can create products only after a safe default price and category policy is defined. Otherwise, a three-column workbook can update existing products but cannot safely create complete POS products.

### Workbook validation

- Header names and required columns must match the supported format.
- Wholly blank rows may be ignored.
- Partially populated rows are invalid.
- Formulas, formula-like executable values, merged data cells, and unsupported cell types are rejected.
- Duplicate normalized names inside the workbook are rejected.
- If a normalized name matches multiple existing products, the row is ambiguous and validation fails.
- Cell lengths, worksheet count, compressed file size, and row count are bounded.
- Errors retain their original Excel row and column references.

Product-name normalization should trim leading and trailing whitespace, collapse repeated internal whitespace, and compare case-insensitively. A future stable SKU or product ID should replace name matching when one is available.

## 5. System architecture

```text
Browser
  ├── GraphQL: create job and obtain S3 upload details
  ├── Direct upload to private S3
  ├── GraphQL: queue validation or export
  └── Poll persisted job progress

API
  ├── Authenticates the user and tenant
  ├── Creates short-lived S3 upload/download authorization
  ├── Stores job state in MongoDB
  └── Enqueues work in BullMQ

Worker
  ├── Streams workbooks from or to S3
  ├── Validates and stages import rows
  ├── Applies confirmed rows in batches
  ├── Generates exports and error reports
  └── Persists progress in MongoDB
```

### Infrastructure

- **S3:** Private source files, generated exports, and validation-error workbooks.
- **Redis or Valkey:** BullMQ queue storage.
- **BullMQ:** Durable background validation, import, and export jobs.
- **MongoDB:** User-visible job state, progress, and temporary staged rows.
- **Worker process:** Runs separately from the API so workbook processing cannot block API traffic.

MongoDB is the source of truth for user-visible progress. BullMQ progress is operational metadata only.

## 6. Import workflow

### 6.1 Create and upload

1. The client requests a new import job through GraphQL.
2. The server verifies admin and tenant access.
3. The server creates an `AWAITING_UPLOAD` job and an S3 object key.
4. The server returns a presigned POST that expires after approximately 15 minutes.
5. The browser uploads directly to S3 and displays upload progress.
6. The client asks the server to queue validation.
7. The server verifies the object with `HeadObject` before enqueueing work.

Recommended initial limits:

- Maximum compressed file size: 10 MiB.
- Maximum data rows: 10,000.
- One products worksheet with only the supported columns.

### 6.2 Validate and stage

The validation worker streams the workbook and:

1. Verifies the workbook structure and headers.
2. Normalizes and validates every row.
3. Detects duplicate and ambiguous product names.
4. Determines whether each row will create or update a product.
5. Writes normalized rows to a temporary staging collection in batches of 500.
6. Updates validation progress after each batch.

Validation does not modify products or inventory. When validation succeeds, the job moves to `AWAITING_CONFIRMATION` and reports create, update, and error counts.

When validation fails, the worker produces an error workbook containing the original row number, column, submitted value, and error message. No product writes occur.

### 6.3 Confirm and apply

After reviewing the validation summary, the administrator confirms the import. The apply worker then:

1. Claims the job and prevents another import from running for the same tenant.
2. Reads staged rows in stable batches of 500.
3. Creates missing products using the approved product service.
4. Reconciles matching product quantities through the inventory service.
5. Commits one database transaction per batch where supported.
6. Stores a checkpoint and progress after each successful batch.
7. Retries transient failures with exponential backoff.

Batch size and worker concurrency must be configurable. The initial deployment should use one active import per tenant and a global worker concurrency of two.

The job is validated completely before application begins, but the full 10,000-row operation is not one database transaction. Application is made reliable through batch transactions, checkpoints, and idempotency rather than a long-running global transaction.

Cancellation is allowed before application begins. Once application begins, the system should resume it to completion instead of intentionally leaving a partial catalog update.

## 7. Inventory reconciliation and idempotency

Imports must use the inventory service and must not directly mutate a product quantity field.

For ledger-based inventory, each matching row produces an adjustment:

```text
adjustment = imported quantity - current quantity
```

The adjustment should include:

- Reason: `spreadsheet_import`.
- Import job ID.
- Spreadsheet row number.
- User who requested the import.

The combination of import job ID and spreadsheet row number is the idempotency key. Reprocessing a batch must not create a duplicate product or apply a stock adjustment twice.

Quantity is reconciled at the time the row is applied. A sale committed after reconciliation changes stock normally. The product and inventory services must define transaction ordering for a sale that occurs concurrently with reconciliation.

## 8. Job state and progress

Suggested import statuses:

```text
AWAITING_UPLOAD
QUEUED_FOR_VALIDATION
VALIDATING
AWAITING_CONFIRMATION
QUEUED_FOR_IMPORT
IMPORTING
COMPLETED
VALIDATION_FAILED
FAILED
CANCELLED
```

A persisted job should include:

```ts
type ProductTransferJob = {
  tenantId: string;
  requestedBy: string;
  type: "IMPORT" | "EXPORT";
  status: string;
  s3InputKey?: string;
  s3OutputKey?: string;
  s3ErrorKey?: string;
  totalRows: number;
  validatedRows: number;
  appliedRows: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  currentBatch?: number;
  lastCompletedRow?: number;
  failureReason?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
};
```

Staged rows require a unique index on job ID and row number and a TTL cleanup policy.

### Client progress

The client polls job state approximately every two seconds while a job is active. Actual counts should be shown instead of a simulated percentage:

```text
Validating: 6,500 / 8,420 rows
```

```text
Importing: 4,000 / 8,420 rows
Created: 125
Updated: 3,875
```

The operation survives navigation, reloads, and closing the browser. Returning to the catalog restores the tenant's active or most recent job from the server.

After completion, the client refreshes the tenant's complete IndexedDB product snapshot. TanStack query invalidation alone is insufficient because the catalog reads products from Dexie.

## 9. Export workflow

1. An administrator requests an export job.
2. The API authenticates the tenant and enqueues the job.
3. The worker reads all tenant products using stable cursor pagination.
4. The worker streams rows into an XLSX writer.
5. The XLSX output streams into private S3 storage.
6. The job stores the total exported rows and moves to `COMPLETED`.
7. The client requests a short-lived signed download URL.

Exports must not rely on the current search filter or the potentially stale browser cache. The workbook should use the same columns and validation-compatible values as the import template.

## 10. S3 configuration

Use one private bucket initially with server-generated object keys:

```text
tenants/{tenantId}/product-imports/{jobId}/source.xlsx
tenants/{tenantId}/product-imports/{jobId}/errors.xlsx
tenants/{tenantId}/product-exports/{jobId}/products.xlsx
```

Required controls:

- Block Public Access enabled.
- Default server-side encryption enabled.
- Presigned upload lifetime of approximately 15 minutes.
- Presigned download lifetime of approximately 5 minutes.
- Lifecycle deletion after seven days.
- CORS restricted to approved client origins.
- Production access through an IAM role instead of long-lived access keys.
- IAM permissions restricted to the configured bucket and prefixes.
- Server-side object-size and metadata verification before queueing.

MinIO or LocalStack may provide an S3-compatible local development environment. Production should use workload IAM credentials and must not commit credentials to the repository.

## 11. Proposed code organization

### Server

```text
app/server/src/features/product-transfer/
  product-transfer.module.ts
  product-transfer.resolver.ts
  product-transfer.service.ts
  product-transfer.types.ts
  schemas/
    product-transfer-job.schema.ts
    product-import-row.schema.ts
  processors/
    product-import.processor.ts
    product-export.processor.ts
  services/
    product-workbook.service.ts
    product-storage.service.ts
```

Expected dependencies include:

```text
@nestjs/bullmq
bullmq
ioredis
@aws-sdk/client-s3
@aws-sdk/s3-presigned-post
@aws-sdk/s3-request-presigner
@aws-sdk/lib-storage
exceljs
```

The API and worker should have separate production entry points and deployment commands.

### Client

```text
app/client/src/features/product/components/
  ProductImportSheet.tsx
  ProductImportProgress.tsx
  ProductExportProgress.tsx

app/client/src/services/product-transfer/
  product-transfer.api.ts
  product-transfer.queries.ts
  product-transfer.types.ts
```

Import and export should be secondary catalog actions. Adding one product remains the primary action.

## 12. GraphQL surface

The final names may follow established repository conventions, but the API needs operations equivalent to:

```text
createProductImportUpload
queueProductImportValidation
confirmProductImport
cancelProductImport
productImportJob
activeProductImportJob
createProductExport
productExportJob
createProductTransferDownloadUrl
```

All operations must enforce authentication, tenant access, and administrator permissions on the server. Tenant identity must come from the authenticated request, never from workbook data or an arbitrary object key.

## 13. Failure behavior

- Invalid workbook: no product changes.
- Expired or incomplete S3 upload: job expires without processing.
- Worker crash during validation: restart validation safely.
- Worker crash during application: resume after the last committed batch.
- Duplicate queue delivery: idempotency prevents duplicate creates or stock adjustments.
- Terminal transient failure: retain job details and permit an authorized resume.
- Local cache refresh failure after server success: report import success and separately retry local refresh.

Error details should be actionable and must not expose another tenant's product or file information.

## 14. Testing

Automated and manual verification should cover:

- Valid files containing 1, 1,000, and 10,000 rows.
- Rejection of 10,001 rows and oversized files.
- Export followed by re-import.
- Blank, malformed, and formula-containing workbooks.
- Missing, duplicate, and unexpected headers.
- Negative, invalid, zero, and fractional quantities according to inventory rules.
- Unicode product names and units.
- Duplicate names in one workbook.
- Ambiguous existing product names.
- Existing-product quantity reconciliation.
- New-product creation with all required fields.
- Omitted products remaining unchanged.
- Worker failure between batches and successful resume.
- Duplicate queue delivery without duplicate inventory effects.
- Concurrent sales and inventory reconciliation.
- Tenant isolation and staff/admin authorization.
- S3 URL expiration, private access, lifecycle cleanup, and invalid object metadata.
- Catalog refresh after completion, including tenant isolation in IndexedDB.

## 15. Acceptance criteria

- A 10,000-row import does not block API request handling.
- The browser can close without cancelling server-side work.
- Progress and results survive reloads.
- Invalid files make no product or inventory changes.
- Existing matches only reconcile quantity in the first release.
- Missing products are created with valid POS fields.
- Worker retries never duplicate stock adjustments or products.
- Exports include every product belonging to the active tenant.
- Generated exports can be imported using the same workbook contract.
- Uploaded and generated files remain private and expire automatically.
- Offline and unauthorized users cannot initiate an import or export.

## 16. Estimated implementation effort

Assuming the unit and inventory services are complete, the expected effort is approximately **8–12 engineering days** for one engineer:

- S3, Redis/Valkey, BullMQ, and worker setup.
- Job models and GraphQL lifecycle.
- Streaming validation and staging.
- Idempotent batched import.
- Streaming export.
- Progress, preview, and error-report UI.
- Automated tests and production hardening.

Deployment work may add time if S3, Redis/Valkey, IAM roles, and a worker process have not yet been provisioned.
