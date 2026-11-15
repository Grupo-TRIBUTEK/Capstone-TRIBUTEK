import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { EmailCodeDto } from './security.dto.js'

export class Verify2faDto extends EmailCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  challengeToken: string

  @IsOptional()
  @IsIn(['app', 'email'])
  method?: 'app' | 'email'
}
