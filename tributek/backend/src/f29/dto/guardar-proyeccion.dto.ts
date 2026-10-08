// Proyección F29 que se guarda en PUT /f29/proyeccion/:clienteId.
// QUÉ HACE: define la forma del body (1:1 con el tipo `Projection` de
//   `f29/model.ts`: manual + ppm + revisión + fuentes RCV con detalle).
// SOLUCIÓN: clases tipadas en vez de `any`; la validación de contenido vive en
//   el service (códigos, signos, duplicados) mientras `class-validator` siga
//   pendiente (patrón de GuardarFormalizacionDto).
// EVITAR: agregar campos al body sin pasarlos primero por aquí.
export class MovimientoF29Dto {
  code?: number;
  rut?: string;
  name?: string;
  folio?: string;
  date?: string;
  exempt?: number;
  net?: number;
  iva?: number;
  total?: number;
}

export class FuenteF29Dto {
  name?: string;
  rows?: MovimientoF29Dto[];
}

export class GuardarProyeccionDto {
  anio?: number;
  mes?: number;
  manual?: Record<string, number>;
  ppmRate?: number;
  ppmOverride?: number | null;
  reviewed?: boolean;
  ventas?: FuenteF29Dto | null;
  compras?: FuenteF29Dto | null;
}