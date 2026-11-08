import 'dotenv/config'
import mongoose from 'mongoose'

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm-clear')

const main = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  if (!dryRun && !confirmed) {
    throw new Error(
      'Pass --confirm-clear to permanently remove all data from the database'
    )
  }

  await mongoose.connect(uri)
  const database = mongoose.connection.db
  if (!database) throw new Error('Database connection was not established')

  const collections = await database
    .listCollections({ type: 'collection' }, { nameOnly: true })
    .toArray()
  const collectionNames = collections
    .map(({ name }) => name)
    .filter((name) => !name.startsWith('system.'))
    .sort()

  console.log(
    `${dryRun ? 'Inspecting' : 'Clearing'} database "${database.databaseName}"`
  )

  if (collectionNames.length === 0) {
    console.log('No collections found.')
    return
  }

  for (const name of collectionNames) {
    const collection = database.collection(name)
    const count = await collection.countDocuments()

    if (dryRun) {
      console.log(`${name}: ${count} document(s) would be removed`)
      continue
    }

    const result = await collection.deleteMany({})
    console.log(`${name}: ${result.deletedCount} document(s) removed`)
  }

  if (!dryRun) {
    console.log('Database cleared successfully.')
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
