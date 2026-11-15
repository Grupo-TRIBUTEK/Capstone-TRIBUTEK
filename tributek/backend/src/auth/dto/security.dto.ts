import { IsString, MaxLength, MinLength } from 'class-validator'

export class PasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string
}
export class EmailChallengeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  challengeToken: string
}
export class EmailCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code: string
}
export class RelinkDto extends PasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  recoveryCode: string
}
