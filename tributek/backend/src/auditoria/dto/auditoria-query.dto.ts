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
  limite?: number = 20;

  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
