import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class ActivarCuentaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombreUsuario?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password: string

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  confirmarPassword: string
}
