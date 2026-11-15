/** Contrato de entrada para desactivar 2FA. */
export class Disable2faDto {
  password: string;
  code?: string;
}
