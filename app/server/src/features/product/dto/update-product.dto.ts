import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { ProductCategory } from '../schemas/product.schema'

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  printCount?: number

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory
}
