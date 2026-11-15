/** Contrato de entrada para verificar código 2FA durante login. */
export class Verify2faDto {
  challengeToken: string;
  code: string;
}
