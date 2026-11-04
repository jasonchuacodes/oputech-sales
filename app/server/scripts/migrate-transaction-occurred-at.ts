import 'dotenv/config'
import mongoose from 'mongoose'

const mongoUri = process.env.MONGO_URI
const dryRun = process.argv.includes('--dry-run')

if (!mongoUri) {
  console.error('MONGO_URI env var is required')
  process.exit(1)
}

const main = async () => {
  await mongoose.connect(mongoUri)

  const transactions = mongoose.connection.collection('transactions')
  const filter = {
    createdAt: { $type: 'date' },
    $or: [{ occurredAt: { $exists: false } }, { occurredAt: null }],
  }
  const matchedCount = await transactions.countDocuments(filter)

  if (dryRun) {
    console.log(
      `[dry-run] ${matchedCount} transaction(s) would receive occurredAt from createdAt.`
    )
    return
  }

  const result = await transactions.updateMany(filter, [
    { $set: { occurredAt: '$createdAt' } },
  ])

  console.log(
    `Migration complete: matched ${result.matchedCount}, updated ${result.modifiedCount} transaction(s).`
  )
}

main()
  .catch((error: unknown) => {
    console.error('Transaction occurredAt migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
