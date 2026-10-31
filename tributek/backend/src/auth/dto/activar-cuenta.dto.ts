/**
 * Contrato de entrada para sesión, credenciales y permisos de acceso. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class ActivarCuentaDto {
  token: string;
  nombreUsuario?: string;
  email?: string;
  password: string;
  confirmarPassword: string;
}
