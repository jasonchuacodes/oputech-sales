import { IsInt, IsString, Matches, Max, Min } from 'class-validator'
import { MAX_PRODUCT_TRANSFER_FILE_BYTES } from '../product-transfer.constants'

export class CreateProductImportUploadDto {
  @IsString()
  @Matches(/\.xlsx$/iu, { message: 'Select an .xlsx workbook.' })
  fileName: string

  @IsInt()
  @Min(1)
  @Max(MAX_PRODUCT_TRANSFER_FILE_BYTES)
  fileSize: number
}
