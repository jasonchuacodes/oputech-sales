# Inventory Product Migration Runbook

**Status:** Ready for production review

**Applies to:** `app/server`, MongoDB, production deployment

**Last reviewed:** 2026-11-13

## 1. Purpose

This runbook migrates the current stock balance from the legacy `stocks` collection into the corresponding product document.

The target structure is:

```text
Product
└── inventory
    ├── stockCount
    ├── unit
    └── revision

StockMovement
├── delta
├── balanceBefore
└── balanceAfter
```

The migration:

- Copies each legacy stock balance into `Product.inventory`.
- Uses the legacy stock sequence as the initial product inventory revision.
- Calculates missing movement `balanceBefore` values as `balanceAfter - delta`.
- Preserves the `stocks` collection, `stockTrackingEnabled`, and movement `stockId` fields for an immediate rollback.
- Does not drop or destructively clean legacy data.

Legacy data is removed later with a separate, explicitly confirmed cleanup command.

## 2. Maintenance window

Reserve a one-hour production maintenance window. The expected write downtime is 15–30 minutes, with the remainder kept as verification and rollback buffer.

Suggested allocation:

| Time          | Activity                                                |
| ------------- | ------------------------------------------------------- |
| 0–10 minutes  | Enter maintenance mode, stop writes, and confirm backup |
| 10–20 minutes | Run the migration                                       |
| 20–35 minutes | Deploy and start the new release                        |
| 35–50 minutes | Run smoke tests and data checks                         |
| 50–60 minutes | Reopen production or roll back                          |

The actual time depends on database size, backup duration, and deployment infrastructure.

## 3. Preconditions

Before the maintenance window:

- [ ] Confirm the target release contains the inventory embedding migration.
- [ ] Confirm production has a tested MongoDB backup and restore procedure.
- [ ] Confirm an operator can stop or scale down every application instance and background worker that can create sales or modify inventory.
- [ ] Confirm the production `MONGO_URI` is available to the server migration process.
- [ ] Install dependencies for the target release.
- [ ] Record the currently deployed release so it can be redeployed during rollback.
- [ ] Notify users of the maintenance window.

Do not print, copy into documentation, or commit the production connection string.

## 4. Pre-window dry run

Run the dry run from the repository root using the target release code:

```bash
pnpm --filter @oputech/sales-server migrate:embed-stock -- --dry-run
```

The command reads `MONGO_URI` from the server environment and performs validation without writing data.

Expected output resembles:

```text
Would migrate 120 stock balance(s) and 480 movement(s)
```

The dry run fails if it finds:

- Multiple stock records for one product.
- A stock record without a matching product in the same tenant.
- Existing embedded inventory that disagrees with the legacy balance, unit, or revision.

Resolve every validation error before the maintenance window. Do not bypass validation by editing production records without first understanding the discrepancy.

## 5. Production migration procedure

### 5.1 Enter maintenance mode

1. Prevent users from creating sales or changing inventory.
2. Stop or scale down all old application instances.
3. Stop background workers or queued jobs that can write transactions, products, stock, or movements.
4. Confirm no application process is still writing to MongoDB.

The old and new application versions must not write inventory concurrently. There is no dual-write period between the legacy and embedded models.

### 5.2 Take the final backup

Take a fresh production backup after writes have stopped. Record:

- Backup identifier.
- Backup completion time.
- Current deployed release.
- Migration operator.
- Maintenance start time.

Do not continue until the backup reports success.

### 5.3 Apply the migration

From the repository root, using the production server environment:

```bash
pnpm --filter @oputech/sales-server migrate:embed-stock -- --confirm-migration
```

Expected output resembles:

```text
Migrating 120 stock balance(s) and 480 movement(s)
Inventory embedding migration completed. Legacy stock data and fields were retained for rollback.
```

If the command exits with an error:

1. Keep production in maintenance mode.
2. Save the complete error output.
3. Do not run legacy cleanup.
4. Investigate whether any writes occurred after the backup.
5. Restore the backup if the migration partially changed data and cannot be safely completed.

### 5.4 Deploy the new release

Deploy the release that reads and writes `Product.inventory`. Start only the new application version.

Do not reopen user access yet.

## 6. Verification checklist

Complete these checks while production remains in maintenance mode.

### 6.1 Data checks

- [ ] The number of products with embedded inventory is at least the number of legacy stock records.
- [ ] Every legacy tracked product has `inventory.stockCount`, `inventory.unit`, and `inventory.revision`.
- [ ] No stock movement is missing `balanceBefore`.
- [ ] Sample products match their pre-migration balance and unit.
- [ ] Legacy `stocks` records still exist.

Optional MongoDB checks:

```javascript
db.stocks.countDocuments({})
db.products.countDocuments({ 'inventory.stockCount': { $exists: true } })
db.stockmovements.countDocuments({ balanceBefore: { $exists: false } })
```

The final query must return `0`.

### 6.2 Application smoke tests

Use dedicated test products or operations that can be safely reversed or retained.

- [ ] Products page loads and displays stock counts.
- [ ] An untracked product can be set up with an opening count.
- [ ] Receiving stock increases the balance and revision.
- [ ] Reconciling a count records the expected correction.
- [ ] Creating a sale reduces the tracked product balance.
- [ ] Voiding that sale restores the balance.
- [ ] Movement history shows correct changes and before/after balances.
- [ ] Product search and pagination still work.
- [ ] Application logs contain no inventory or GraphQL errors.

Record the products and transaction IDs used during verification.

## 7. Reopening production

Reopen production only when all required verification checks pass.

Record:

- New deployed release.
- Migration completion time.
- Verification operator.
- Any known warnings or follow-up work.

Monitor errors, transaction creation, stock changes, and movement creation closely after reopening.

## 8. Rollback procedure

### 8.1 Rollback before reopening writes

The safest rollback point is during the maintenance window, before users can create new transactions under the embedded model.

1. Stop the new application version.
2. Redeploy the previously recorded release.
3. Start the old application version.
4. Verify that it reads the retained `stocks` collection.
5. Verify one sale and stock operation if safe.
6. Reopen production.

The initial migration deliberately retains the legacy collection and fields required by the old version. The old application ignores the additional embedded inventory field.

### 8.2 Rollback after reopening writes

Do not perform a simple application rollback after new writes have been accepted. The new application does not update the legacy `stocks` collection, so it becomes stale as soon as a sale or inventory operation occurs.

A later rollback requires one of the following:

- Restore the pre-migration backup, accepting the loss or separate recovery of newer business data.
- Build and validate a reverse migration from embedded inventory and newer movement records.
- Keep the new release deployed and apply a forward fix.

Escalate and choose a recovery strategy based on the affected data. Do not run the old release against stale legacy balances.

## 9. Delayed legacy cleanup

Do not clean up legacy data during the initial migration window.

Wait for an agreed stabilization period, recommended at least 24–72 hours. Before cleanup:

- [ ] Confirm the new release is stable.
- [ ] Confirm no rollback to the old data model is planned.
- [ ] Take another MongoDB backup.
- [ ] Confirm all active products have valid embedded inventory.

Run the cleanup dry run:

```bash
pnpm --filter @oputech/sales-server cleanup:legacy-stock -- --dry-run
```

The validator accepts products whose revision has advanced since migration, while rejecting:

- Missing embedded inventory.
- Unit mismatches.
- Revisions lower than the legacy sequence.
- Balance mismatches when the revision has not advanced.

If the dry run succeeds, apply cleanup:

```bash
pnpm --filter @oputech/sales-server cleanup:legacy-stock -- --confirm-drop
```

This command permanently:

- Drops the legacy `stocks` collection.
- Removes `stockTrackingEnabled` from product documents.
- Removes legacy `stockId` references from movement documents.

After cleanup, the immediate old-version rollback path is no longer available.

## 10. Post-cleanup verification

- [ ] Products page still displays balances.
- [ ] Sales, voids, receipts, and reconciliations still work.
- [ ] Movement history remains complete.
- [ ] The `stocks` collection no longer exists.
- [ ] No product retains `stockTrackingEnabled`.
- [ ] No movement retains `stockId`.
- [ ] Monitoring shows no new inventory errors.

Record the cleanup backup identifier, command output, operator, and completion time with the production change record.
