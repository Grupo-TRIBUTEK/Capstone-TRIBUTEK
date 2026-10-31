/**
 * Contrato de entrada para estructura del módulo de usuarios. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
export class CreateUsuarioDto {
  rolId: bigint;
  nombre: string;
  email?: string;
  nombreUsuario: string;
  passwordHash: string;
}
