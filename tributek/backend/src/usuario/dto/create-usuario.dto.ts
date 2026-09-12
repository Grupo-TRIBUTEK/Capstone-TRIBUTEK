export class CreateUsuarioDto {
  rolId: bigint;
  nombre: string;
  email?: string;
  nombreUsuario: string;
  passwordHash: string;
}