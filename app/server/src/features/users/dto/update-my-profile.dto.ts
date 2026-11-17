import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string | null
}
