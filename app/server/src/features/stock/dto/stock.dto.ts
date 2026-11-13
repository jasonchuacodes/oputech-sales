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
import { STOCK_UNIT_MAX_LENGTH } from '../stock-unit'
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(STOCK_UNIT_MAX_LENGTH)
  unit: string

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

export class CreateStockUnitOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(STOCK_UNIT_MAX_LENGTH)
  label: string
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

  @IsInt()
  @Min(1)
  expectedRevision: number

  @IsOptional()
  @IsString()
  occurredAt?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string
}
