/**
 * Contrato de entrada para catálogo de servicios y asignaciones a clientes. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class CreateServicioDto {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}
