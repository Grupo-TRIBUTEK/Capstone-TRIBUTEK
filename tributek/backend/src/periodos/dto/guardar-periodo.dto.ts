/**
 * Contrato de entrada para períodos contables por cliente, año y mes. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
// Período contable (fila de `periodos_cliente`) que se guarda en PUT /periodos.
// QUÉ HACE: define la forma del body del upsert (cliente + año + mes).
// SOLUCIÓN: clase tipada en vez de `any`; la validación de contenido vive en
//   el service mientras `class-validator` siga pendiente (patrón de gestiones).
// EVITAR: agregar campos al body sin pasarlos primero por aquí.
export class GuardarPeriodoDto {
  clienteId?: string;
  anio?: number;
  mes?: number;
  estadoContable?: string;
  fechaVencimiento?: string;
  cerrado?: boolean;
}
