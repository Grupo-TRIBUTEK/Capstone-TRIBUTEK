export const entities = {
  Cliente: "Clientes", Transaccion: "Pagos y abonos", Obligacion: "Obligaciones",
  Documento: "Documentos", Factura: "Facturación", Gestion: "Constitución de empresas y gestiones",
  Usuario: "Accesos y seguridad", ProyeccionF29: "Proyección F29",
} as const;
export const actions = {
  CREAR: "Creación", ACTUALIZAR: "Actualización", ELIMINAR: "Eliminación",
  DESACTIVAR: "Desactivación", ANULAR: "Anulación", PUBLICAR: "Publicación",
  INICIAR_SESION: "Inicio de sesión", ACCESO_FALLIDO: "Acceso fallido",
  CAMBIAR_PERMISOS: "Cambio de permisos",
} as const;
export type AuditEntry = {
  id: string; creadoEn: string | null; accion: string; entidad: string;
  entidadId: string | null; detalle: string | null;
  usuario: { nombreUsuario: string } | null;
};
export type AuditPage = { items: AuditEntry[]; total: number };
export function label(values: Record<string, string>, value: string) {
  return values[value] || value;
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parsePage(value: unknown): AuditPage {
  if (!object(value) || !Array.isArray(value.items) || !Number.isSafeInteger(value.total) || Number(value.total) < 0) {
    throw new Error("La respuesta del historial no tiene el formato esperado.");
  }
  const items = value.items.map((row): AuditEntry => {
    if (!object(row) || typeof row.id !== "string" || !row.id ||
      typeof row.accion !== "string" || typeof row.entidad !== "string" ||
      !(row.entidadId === null || typeof row.entidadId === "string") ||
      !(row.detalle === null || typeof row.detalle === "string") ||
      !(row.creadoEn === null || (typeof row.creadoEn === "string" && Number.isFinite(Date.parse(row.creadoEn)))) ||
      !(row.usuario === null || (object(row.usuario) && typeof row.usuario.nombreUsuario === "string"))) {
      throw new Error("No se pudieron interpretar los registros del historial.");
    }
    return row as AuditEntry;
  });
  if (items.length > 20 || items.length > Number(value.total)) throw new Error("La cantidad de registros recibida no es válida.");
  return { items, total: Number(value.total) };
}
export function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value)) : "Sin fecha registrada";
}
