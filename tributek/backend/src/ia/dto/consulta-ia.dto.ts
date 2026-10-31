/**
 * Contrato de entrada para consultas del asistente a Ollama. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
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
