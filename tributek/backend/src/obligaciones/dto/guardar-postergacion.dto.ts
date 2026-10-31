/**
 * Contrato de entrada para montos mensuales, abonos y postergaciones. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class GuardarPostergacionDto {
  anio?: number;
  mes?: number;
  concept?: string;
  amount?: number;
  due?: string;
  note?: string;
}
