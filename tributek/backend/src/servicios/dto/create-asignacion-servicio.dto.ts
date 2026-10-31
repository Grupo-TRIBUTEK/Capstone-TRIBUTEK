/**
 * Contrato de entrada para catálogo de servicios y asignaciones a clientes. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class CreateAsignacionServicioDto {
  clienteId: string;
  servicioId: string;
  fechaInicio?: string;
  fechaTermino?: string;
  estado: string;
}
