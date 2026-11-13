import 'dotenv/config'
import Decimal from 'decimal.js'
import mongoose, { Types } from 'mongoose'

const dryRun = process.argv.includes('--dry-run')
const confirmed = process.argv.includes('--confirm-migration')

interface LegacyStock {
  _id: unknown
  tenantId: string
  productId: string
  quantity: { toString(): string }
  unit: string
  sequence?: number
}

interface ProductRecord {
  _id: unknown
  tenantId: string
  inventory?: {
    stockCount: { toString(): string }
    unit: string
    revision: number
  }
}

interface MovementRecord {
  _id: unknown
  delta: { toString(): string }
  balanceAfter: { toString(): string }
}

const main = async () => {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI env var is required')
  if (!dryRun && !confirmed) {
    throw new Error('Pass --confirm-migration to update inventory data')
  }

  await mongoose.connect(uri)
  const database = mongoose.connection.db
  if (!database) throw new Error('Database connection was not established')

  const stocks = await database
    .collection<LegacyStock>('stocks')
    .find()
    .toArray()
  const productIds = new Set<string>()
  const productUpdates: Array<{ stock: LegacyStock; product: ProductRecord }> =
    []

  for (const stock of stocks) {
    if (productIds.has(stock.productId)) {
      throw new Error(
        `Multiple stock records found for product ${stock.productId}`
      )
    }
    productIds.add(stock.productId)

    const product = await database
      .collection<ProductRecord>('products')
      .findOne({
        _id: new Types.ObjectId(stock.productId) as never,
        tenantId: stock.tenantId,
      })
    if (!product) {
      throw new Error(
        `Stock ${String(stock._id)} has no matching tenant product`
      )
    }
    if (product.inventory) {
      const matches =
        product.inventory.stockCount.toString() === stock.quantity.toString() &&
        product.inventory.unit === stock.unit &&
        product.inventory.revision === Math.max(stock.sequence ?? 1, 1)
      if (!matches) {
        throw new Error(
          `Product ${stock.productId} already has different inventory data`
        )
      }
    }
    productUpdates.push({ stock, product })
  }

  const movements = await database
    .collection<MovementRecord>('stockmovements')
    .find({ balanceBefore: { $exists: false } } as never)
    .toArray()

  console.log(
    `${dryRun ? 'Would migrate' : 'Migrating'} ${productUpdates.length} stock balance(s) and ${movements.length} movement(s)`
  )
  if (dryRun) return

  if (productUpdates.length > 0) {
    await database.collection('products').bulkWrite(
      productUpdates.map(({ stock, product }) => ({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              inventory: {
                stockCount: stock.quantity,
                unit: stock.unit,
                revision: Math.max(stock.sequence ?? 1, 1),
              },
            },
            $unset: { stockTrackingEnabled: '' },
          },
        },
      }))
    )
  }

  if (movements.length > 0) {
    await database.collection('stockmovements').bulkWrite(
      movements.map((movement) => {
        const balanceBefore = new Decimal(
          movement.balanceAfter.toString()
        ).minus(movement.delta.toString())
        return {
          updateOne: {
            filter: { _id: movement._id },
            update: {
              $set: {
                balanceBefore: Types.Decimal128.fromString(
                  balanceBefore.toString()
                ),
              },
              $unset: { stockId: '' },
            },
          },
        }
      })
    )
  }

  await database
    .collection('products')
    .updateMany(
      { stockTrackingEnabled: { $exists: true } },
      { $unset: { stockTrackingEnabled: '' } }
    )

  console.log(
    'Inventory embedding migration completed. The stocks collection was retained.'
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
