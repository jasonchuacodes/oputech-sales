import 'dotenv/config'
import mongoose, { Types } from 'mongoose'

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm-drop')

const main = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  if (!dryRun && !confirmed) {
    throw new Error(
      'Pass --confirm-drop to remove the legacy stocks collection'
    )
  }

  await mongoose.connect(uri)
  const database = mongoose.connection.db
  if (!database) throw new Error('Database connection was not established')

  const exists = await database
    .listCollections({ name: 'stocks' }, { nameOnly: true })
    .hasNext()
  if (!exists) {
    console.log('The legacy stocks collection does not exist.')
    return
  }

  const stocks = await database.collection('stocks').find().toArray()
  for (const stock of stocks) {
    const product = await database.collection('products').findOne({
      _id: new Types.ObjectId(String(stock.productId)),
      tenantId: stock.tenantId,
    })
    const inventory = product?.inventory as
      | {
          stockCount?: { toString(): string }
          unit?: string
          revision?: number
        }
      | undefined
    if (
      !inventory ||
      inventory.stockCount?.toString() !== stock.quantity?.toString() ||
      inventory.unit !== stock.unit ||
      inventory.revision !== Math.max(stock.sequence ?? 1, 1)
    ) {
      throw new Error(
        `Product ${String(stock.productId)} is not safely migrated`
      )
    }
  }

  if (dryRun) {
    console.log(
      `${stocks.length} verified legacy stock record(s) would be dropped.`
    )
    return
  }

  await database.dropCollection('stocks')
  console.log(
    `Dropped the legacy stocks collection after verifying ${stocks.length} record(s).`
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
