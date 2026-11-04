import { Query, Mutation, Resolver, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ProductService } from './product.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { InvalidInputException, PayloadTooLargeException } from '../../common/exceptions'
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard'
import { TenantId } from '../tenant/decorators/tenant-id.decorator'
import { AdminGuard } from '../auth/guards/admin.guard'

@UseGuards(JwtAuthGuard, TenantAccessGuard)
@Resolver('Product')
export class ProductResolver {
  constructor(private readonly product: ProductService) {}

  @Query()
  products(@TenantId() tenantId: string, @Args('search') search?: string) {
    return this.product.findAll(tenantId, search)
  }

  @Mutation()
  @UseGuards(AdminGuard)
  async createProduct(@TenantId() tenantId: string, @Args('input') input: CreateProductDto) {
    if (input.imageUrl) {
      this.validateImageUrl(input.imageUrl)
    }
    return this.product.create(tenantId, input)
  }

  private validateImageUrl(imageUrl: string): void {
    if (!imageUrl.startsWith('data:image/')) {
      throw new InvalidInputException(
        'The product image must use a supported image data URL.',
      )
    }

    const imageSizeBytes = this.getBase64Size(imageUrl)
    const maxSizeBytes = 5 * 1024 * 1024
    const minSizeBytes = 0

    if (imageSizeBytes > maxSizeBytes) {
      throw new PayloadTooLargeException(
        `The product image must be smaller than 5MB (received ${Math.round(imageSizeBytes / (1024 * 1024))}MB).`,
      )
    }

    if (imageSizeBytes < minSizeBytes) {
      throw new InvalidInputException(
        'The product image is empty.',
      )
    }
  }

  private getBase64Size(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return 0
    const padding = (base64.match(/=/g) || []).length
    return Math.floor((base64.length * 3) / 4) - padding
  }

  @Mutation()
  @UseGuards(AdminGuard)
  updateProduct(
    @TenantId() tenantId: string,
    @Args('id') id: string,
    @Args('input') input: UpdateProductDto,
  ) {
    return this.product.update(tenantId, id, input)
  }

  @Mutation()
  @UseGuards(AdminGuard)
  async deleteProduct(@TenantId() tenantId: string, @Args('id') id: string): Promise<boolean> {
    const result = await this.product.remove(tenantId, id)
    return result !== null
  }
}
