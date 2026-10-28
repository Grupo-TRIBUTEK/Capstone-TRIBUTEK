/**
 * Contrato de entrada para sesión, credenciales y permisos de acceso. DTO significa objeto de transferencia de datos; sus tipos describen campos. Las comprobaciones en ejecución dependen de decoradores, pipes y validaciones del servicio.
 */
//este no se ejecuta primero creo, verififcar luego
// Estos son los datos que se esperan recibir en el login. Nada mas que eso.
export class LoginDto {
  nombreUsuario: string;
  password: string;
}
