import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator'
import { StockUnit } from '../schemas/stock.schema'
import {
  StockMovementReason,
  StockMovementSourceType,
} from '../schemas/stock-movement.schema'

export class StockPaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}

export class StockMovementFilterDto {
  @IsOptional()
  @IsString()
  productId?: string

  @IsOptional()
  @IsEnum(StockMovementReason)
  reason?: StockMovementReason

  @IsOptional()
  @IsEnum(StockMovementSourceType)
  sourceType?: StockMovementSourceType
}

export class EnableStockTrackingDto {
  @IsString()
  @IsNotEmpty()
  clientMutationId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsEnum(StockUnit)
  unit: StockUnit

  @IsString()
  openingQuantity: string

  @IsOptional()
  @IsString()
  occurredAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class ReceiveStockDto {
  @IsString()
  @IsNotEmpty()
  clientMutationId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsString()
  packageCount: string

  @IsString()
  quantityPerPackage: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  packageLabel?: string

  @IsOptional()
  @IsString()
  occurredAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class ReconcileStockDto {
  @IsString()
  @IsNotEmpty()
  clientMutationId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsString()
  countedQuantity: string

  @IsOptional()
  @IsString()
  occurredAt?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string
}
