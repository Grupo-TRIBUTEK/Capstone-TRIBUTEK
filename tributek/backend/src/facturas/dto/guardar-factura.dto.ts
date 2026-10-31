/**
 * Contrato de entrada para registros de facturación. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class GuardarFacturaDto {
  clientId?: string;
  anio?: number;
  mes?: number;
  kind?: string;
  name?: string;
  rut?: string;
  amount?: number;
  description?: string;
  number?: string;
  date?: string;
  note?: string;
}
