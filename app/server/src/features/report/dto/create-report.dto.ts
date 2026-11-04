import { IsDateString } from 'class-validator'

export class CreateReportDto {
  @IsDateString()
  fromDate: string

  @IsDateString()
  toDate: string
}
