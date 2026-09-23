export class CreateTrabajadorDto {
  clienteId: string;
  rut: string;
  nombre: string;
  cargo: string;
  fechaIngreso: string;
  fechaTermino?: string;
  estado: string;
}
