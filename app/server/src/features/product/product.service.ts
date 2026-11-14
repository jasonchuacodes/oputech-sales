import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientSession, Model, QueryFilter } from 'mongoose'
import { Product, ProductDocument } from './schemas/product.schema'
import {
  CreateProductInput,
  CreateImportedProductInput,
  ProductPageResult,
  ProductPagination,
  UpdateProductInput,
} from './product.types'
import { InvalidInputException } from '../../common/exceptions'

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private product: Model<ProductDocument>
  ) {}

  list(
    tenantId: string,
    pagination?: ProductPagination
  ): Promise<ProductPageResult> {
    return this.paginate(
      { tenantId, archivedAt: { $exists: false } },
      pagination
    )
  }

  listByName(
    tenantId: string,
    search: string,
    pagination?: ProductPagination
  ): Promise<ProductPageResult> {
    const term = search.trim()
    if (!term) {
      throw new InvalidInputException('Enter a product name to search for.')
    }

    return this.paginate(
      {
        tenantId,
        archivedAt: { $exists: false },
        name: { $regex: escapeRegExp(term), $options: 'i' },
      },
      pagination
    )
  }

  create(
    tenantId: string,
    input: CreateProductInput
  ): Promise<ProductDocument> {
    return this.product.create({ ...input, tenantId })
  }

  countActive(tenantId: string): Promise<number> {
    return this.product
      .countDocuments({ tenantId, archivedAt: { $exists: false } })
      .exec()
  }

  listActiveForTransfer(
    tenantId: string,
    limit: number
  ): Promise<ProductDocument[]> {
    return this.product
      .find({ tenantId, archivedAt: { $exists: false } })
      .sort({ _id: 1 })
      .limit(limit)
      .exec()
  }

  findActiveForImport(
    tenantId: string,
    productId: string,
    session: ClientSession
  ): Promise<ProductDocument | null> {
    return this.product
      .findOne({
        _id: productId,
        tenantId,
        archivedAt: { $exists: false },
      })
      .session(session)
      .exec()
  }

  async createForImport(
    tenantId: string,
    input: CreateImportedProductInput,
    session: ClientSession
  ): Promise<ProductDocument> {
    const [product] = await this.product.create(
      [{ tenantId, name: input.name, price: input.price }],
      { session }
    )
    return product
  }

  update(
    tenantId: string,
    id: string,
    input: UpdateProductInput
  ): Promise<ProductDocument | null> {
    return this.product
      .findOneAndUpdate(
        { _id: id, tenantId, archivedAt: { $exists: false } },
        { $set: input },
        { returnDocument: 'after' }
      )
      .exec()
  }

  remove(tenantId: string, id: string): Promise<ProductDocument | null> {
    return this.product
      .findOneAndUpdate(
        { _id: id, tenantId, archivedAt: { $exists: false } },
        { $set: { archivedAt: new Date() } },
        { returnDocument: 'after' }
      )
      .exec()
  }

  private async paginate(
    filter: QueryFilter<Product>,
    pagination?: ProductPagination
  ): Promise<ProductPageResult> {
    const requestedPage = pagination?.page ?? 1
    const pageSize = pagination?.pageSize ?? 50
    const totalCount = await this.product.countDocuments(filter).exec()
    const totalPages = Math.ceil(totalCount / pageSize)
    const page = Math.min(requestedPage, Math.max(totalPages, 1))
    const items = await this.product
      .find(filter)
      .sort({ _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec()

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
    }
  }
}
