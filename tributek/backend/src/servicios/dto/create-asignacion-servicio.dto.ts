export class CreateAsignacionServicioDto {
  clienteId: string;
  servicioId: string;
  fechaInicio?: string;
  fechaTermino?: string;
  estado: string;
}
