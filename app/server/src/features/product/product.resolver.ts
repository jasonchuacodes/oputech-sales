import { Query, Mutation, Resolver, Args } from '@nestjs/graphql'
import { UseGuards, BadRequestException } from '@nestjs/common'
import { ProductService } from './product.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@UseGuards(JwtAuthGuard)
@Resolver('Product')
export class ProductResolver {
  constructor(private readonly product: ProductService) {}

  @Query()
  products(@Args('search') search?: string) {
    return this.product.findAll(search)
  }

  @Mutation()
  async createProduct(@Args('input') input: CreateProductDto) {
    if (input.imageUrl) {
      this.validateImageUrl(input.imageUrl)
    }
    return this.product.create(input)
  }

  private validateImageUrl(imageUrl: string): void {
    if (!imageUrl.startsWith('data:image/')) {
      throw new BadRequestException('Invalid image format')
    }

    const imageSizeBytes = this.getBase64Size(imageUrl)
    const maxSizeBytes = 5 * 1024 * 1024
    const minSizeBytes = 0

    if (imageSizeBytes > maxSizeBytes) {
      throw new BadRequestException(
        `Image size must be smaller than 5MB (received ${Math.round(imageSizeBytes / (1024 * 1024))}MB)`
      )
    }

    if (imageSizeBytes < minSizeBytes) {
      throw new BadRequestException('Image size is too small')
    }
  }

  private getBase64Size(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return 0
    const padding = (base64.match(/=/g) || []).length
    return Math.floor((base64.length * 3) / 4) - padding
  }

  @Mutation()
  updateProduct(@Args('id') id: string, @Args('input') input: UpdateProductDto) {
    return this.product.update(id, input)
  }

  @Mutation()
  async deleteProduct(@Args('id') id: string): Promise<boolean> {
    const result = await this.product.remove(id)
    return result !== null
  }
}
