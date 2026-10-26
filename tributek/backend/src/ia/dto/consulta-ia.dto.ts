import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConsultaIaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  consulta!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contexto?: string;
}
