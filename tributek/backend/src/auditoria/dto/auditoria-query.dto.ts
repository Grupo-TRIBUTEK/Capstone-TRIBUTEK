/**
 * Contrato de entrada para consulta del historial de acciones. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsDateString,
  ValidateIf,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuditoriaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 25

  @IsOptional()
  @IsIn(['reciente', 'personalizado', 'todo'])
  periodo?: 'reciente' | 'personalizado' | 'todo' = 'reciente'

  @IsOptional()
  @IsString()
  @MaxLength(150)
  buscar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accion?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  desde?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  hasta?: string;
}
