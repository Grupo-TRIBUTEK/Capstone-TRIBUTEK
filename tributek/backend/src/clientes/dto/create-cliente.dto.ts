/**
 * Contrato de entrada para directorio de clientes y cuentas del portal. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
// Datos que se esperan recibir para registrar un cliente.
// La validación se realizará posteriormente mediante el DTO.

export class PortalAccessDto {
  invitar?: boolean;
  revocar?: boolean;
  nombreUsuario?: string;
  email?: string;
}

export class CreateClienteDto {
  tipoCliente: string;
  rut: string;
  nombreRazonSocial: string;
  contactoPrincipal?: string;
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  estado: string;
  accesoPortal?: PortalAccessDto;
}
