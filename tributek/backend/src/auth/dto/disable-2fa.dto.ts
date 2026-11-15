import { IsOptional, IsString, MaxLength } from 'class-validator'
import { PasswordDto } from './security.dto.js'

export class Disable2faDto extends PasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string
}
