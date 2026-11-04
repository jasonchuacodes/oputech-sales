import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class ReportDateRangeDto {
  @IsDateString({ strict: true })
  from: string

  @IsDateString({ strict: true })
  to: string
}

export class ReportFilterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportDateRangeDto)
  dateRange?: ReportDateRangeDto
}

export class ReportPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10
}
