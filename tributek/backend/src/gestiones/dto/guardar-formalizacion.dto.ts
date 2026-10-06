// Checklist de Formalizaciones que se guarda en PUT /gestiones/formalizacion/:clienteId.
// QUÉ HACE: define la forma del body (1:1 con el tipo `Process` del frontend).
// SOLUCIÓN: clase tipada en vez de `any`; la validación de contenido vive en el service
//   (catálogo de 11 pasos, estados, fechas) mientras `class-validator` siga pendiente.
// EVITAR: agregar campos al body sin pasarlos primero por aquí.
export class PasoChecklistDto {
  name?: string;
  state?: string;
  date?: string;
}

export class GuardarFormalizacionDto {
  steps?: PasoChecklistDto[];
  note?: string;
}