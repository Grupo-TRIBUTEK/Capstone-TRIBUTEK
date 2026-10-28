/**
 * Contrato de entrada para montos mensuales, abonos y postergaciones. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class RegistrarAbonoDto {
  anio?: number;
  mes?: number;
  concept?: string;
  amount?: number;
  date?: string;
  note?: string;
  transferId?: string;
  method?: string;
  originAccount?: string;
  receivingAccount?: string;
  destination?: string;
  deferredId?: string;
}
