import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Product, ProductDocument } from './schemas/product.schema'
import { CreateProductInput, UpdateProductInput } from './product.types'

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private product: Model<ProductDocument>,
  ) {}

  findAll(tenantId: string, search?: string): Promise<ProductDocument[]> {
    if (search) {
      return this.product
        .find({ tenantId, name: { $regex: search, $options: 'i' } })
        .exec()
    }
    return this.product.find({ tenantId }).exec()
  }

  create(tenantId: string, input: CreateProductInput): Promise<ProductDocument> {
    return this.product.create({ ...input, tenantId })
  }

  update(tenantId: string, id: string, input: UpdateProductInput): Promise<ProductDocument | null> {
    return this.product
      .findOneAndUpdate({ _id: id, tenantId }, { $set: input }, { returnDocument: 'after' })
      .exec()
  }

  remove(tenantId: string, id: string): Promise<ProductDocument | null> {
    return this.product.findOneAndDelete({ _id: id, tenantId }).exec()
  }
}
