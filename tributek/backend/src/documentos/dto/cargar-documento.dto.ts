// Datos que se esperan para cargar un documento.
// QUÉ HACE: define la forma del body en POST /documentos.
// ERROR INICIAL: se usaba `any`, el compilador no revisaba nada.
// SOLUCIÓN: clase con los 5 campos que `cargar()` ya valida a mano.
// EVITAR: no usar `any` en @Body(); crear el DTO primero.
export class CargarDocumentoDto {
  clienteId?: string;
  periodo?: string;
  tipo?: string;
  estado?: string;
  observacion?: string;
}
