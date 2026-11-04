import 'dotenv/config'
import mongoose, { Schema } from 'mongoose'
import { ReportSchema } from '../src/features/report/schemas/report.schema'
import {
  TransactionSchema,
  TransactionType,
  PaymentType,
} from '../src/features/transaction/schemas/transaction.schema'

const ExpenseSchema = new Schema(
  {
    reportId: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
)

const dryRun = process.argv.includes('--dry-run')

const ExpenseModel = mongoose.model('Expense', ExpenseSchema)
const ReportModel = mongoose.model('Report', ReportSchema)
const TransactionModel = mongoose.model('Transaction', TransactionSchema)

const legacyMutationId = (expenseId: mongoose.Types.ObjectId) =>
  `legacy-expense:${expenseId.toString()}`

const main = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI env var is required')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log(`Connected. Dry run: ${dryRun}`)

  const missingTypeFilter = { type: { $exists: false } }
  const staleTransactionCount =
    await TransactionModel.countDocuments(missingTypeFilter).exec()
  console.log(
    `${dryRun ? '[DRY RUN] Would backfill' : 'Backfilling'} type="${TransactionType.SALE}" on ` +
      `${staleTransactionCount} pre-existing transaction(s) missing a type.`
  )
  if (!dryRun && staleTransactionCount > 0) {
    await TransactionModel.updateMany(missingTypeFilter, {
      $set: { type: TransactionType.SALE },
    }).exec()
  }

  const expenses = await ExpenseModel.find().exec()
  console.log(`Found ${expenses.length} expense(s) to migrate.`)

  let created = 0
  let adopted = 0
  let existing = 0
  let skipped = 0
  const claimedLegacyTransactions = new Set<string>()

  for (const expense of expenses) {
    const report = await ReportModel.findById(expense.reportId).exec()
    if (!report) {
      console.warn(
        `Skipping expense ${expense._id} — report ${expense.reportId} not found`
      )
      skipped++
      continue
    }

    const clientMutationId = legacyMutationId(expense._id)
    let transaction = await TransactionModel.findOne({
      clientMutationId,
    }).exec()
    let action: 'existing' | 'adopted' | 'created' = 'existing'

    if (!transaction) {
      // Recover safely if an older version of this migration already created
      // the transaction without an idempotency key.
      const candidates = await TransactionModel.find({
        _id: { $in: report.transactionIds },
        clientMutationId: { $exists: false },
        type: TransactionType.EXPENSE,
        label: expense.label,
        items: { $size: 0 },
        paymentType: PaymentType.CASH,
        total: expense.amount,
        processed: true,
        createdAt: report.toDate,
      })
        .sort({ _id: 1 })
        .exec()
      transaction =
        candidates.find(
          (candidate) =>
            !claimedLegacyTransactions.has(candidate._id.toString())
        ) ?? null

      if (transaction) {
        action = 'adopted'
        claimedLegacyTransactions.add(transaction._id.toString())
        if (!dryRun) {
          transaction = await TransactionModel.findByIdAndUpdate(
            transaction._id,
            {
              $set: {
                clientMutationId,
                occurredAt: report.toDate,
              },
            },
            { new: true }
          ).exec()
        }
      } else {
        action = 'created'
        if (!dryRun) {
          transaction = await TransactionModel.findOneAndUpdate(
            { clientMutationId },
            {
              $setOnInsert: {
                clientMutationId,
                occurredAt: report.toDate,
                type: TransactionType.EXPENSE,
                label: expense.label,
                items: [],
                paymentType: PaymentType.CASH,
                total: expense.amount,
                processed: true,
                createdAt: report.toDate,
                updatedAt: report.toDate,
              },
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              timestamps: false,
            }
          ).exec()
        }
      }
    }

    console.log(
      `${dryRun ? '[DRY RUN] Would use' : 'Using'} ${action} transaction for expense ${expense._id} ` +
        `(label="${expense.label}", amount=${expense.amount}, report=${report._id}, occurredAt=${report.toDate.toISOString()})`
    )

    if (!dryRun && transaction) {
      await ReportModel.updateOne(
        { _id: report._id },
        { $addToSet: { transactionIds: transaction._id.toString() } }
      ).exec()
    }

    if (action === 'created') created++
    else if (action === 'adopted') adopted++
    else existing++
  }

  console.log(
    `Done. Created: ${created}, Adopted: ${adopted}, Existing: ${existing}, ` +
      `Skipped: ${skipped}, Total: ${expenses.length}`
  )
}

main()
  .catch((error: unknown) => {
    console.error('Expense migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
