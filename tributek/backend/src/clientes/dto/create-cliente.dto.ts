// Datos que se esperan recibir para registrar un cliente.
// La validación se realizará posteriormente mediante el DTO.

export class CreateClienteDto {
  tipoCliente: string;
  rut: string;
  nombreRazonSocial: string;
  contactoPrincipal?: string;
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  estado: string;
}
