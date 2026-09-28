export class ActivarCuentaDto {
  token: string;
  nombreUsuario?: string;
  email?: string;
  password: string;
  confirmarPassword: string;
}
