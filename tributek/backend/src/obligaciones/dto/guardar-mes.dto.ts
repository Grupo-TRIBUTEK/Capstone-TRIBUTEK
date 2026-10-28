/**
 * Contrato de entrada para montos mensuales, abonos y postergaciones. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class PasoDto {
  text?: string;
  done?: boolean;
}

export class GuardarMesDto {
  anio?: number;
  mes?: number;
  sent?: boolean;
  amounts?: Record<string, number>;
  steps?: PasoDto[];
  followDate?: string;
  followNote?: string;
  followDone?: boolean;
}
