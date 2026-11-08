import 'dotenv/config'
import mongoose from 'mongoose'

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm-reset')
const collections = [
  'stockmovements',
  'stocks',
  'aggregates',
  'reports',
  'transactions',
  'products',
  'tenants',
  'users',
] as const

const main = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  if (!dryRun && !confirmed) {
    throw new Error('Pass --confirm-reset to permanently remove all tenancy and business data')
  }

  await mongoose.connect(uri)
  const database = mongoose.connection.db
  if (!database) throw new Error('Database connection was not established')

  for (const name of collections) {
    const collection = database.collection(name)
    const count = await collection.countDocuments()
    console.log(`${name}: ${count} document(s) ${dryRun ? 'would be removed' : 'removed'}`)
    if (!dryRun) await collection.deleteMany({})
  }

  if (!dryRun) {
    console.log('Reset complete. Run register-superadmin before using the application.')
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
