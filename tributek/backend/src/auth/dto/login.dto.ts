import { IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nombreUsuario: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string
}
