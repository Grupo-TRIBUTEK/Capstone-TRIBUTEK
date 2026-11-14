/** Límite de acciones del asistente; la identificación de un cliente no concede permiso para editarlo. */
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export function controlPrivado(nombre: string) {
  const etiqueta = normalizar(nombre.split(' — ')[0] ?? nombre)
  if (etiqueta === 'editar') return true
  if (/restaurar respaldo|restaurar datos|importar respaldo/.test(etiqueta)) return true
  if (/contrase|password|token|credencial|jwt|cerrar sesion|permisos|\brol(?:es)?\b|acceso al portal|activar cuenta|revocar acceso|enlace de (activacion|restablecimiento)/.test(etiqueta)) return true
  // Los filtros de búsqueda pueden identificar clientes, pero no modifican sus datos.
  if (/^(buscar|filtrar)\b/.test(etiqueta)) return false
  if (/\b(nuevo|nueva|crear|agregar|registrar|guardar|editar|modificar|eliminar|borrar|habilitar|deshabilitar|activar|revocar|restablecer|invitar)\b.*\b(usuario|usuarios|cuenta|cuentas|cliente|clientes|nombre|contacto|correo|email|telefono|direccion)\b/.test(etiqueta)) return true
  return /^(rut|nombre|razon social|contribuyente|contacto principal|email|correo|telefono|direccion|comuna|cuenta de origen|cuenta de destino|cuenta receptora|cuenta bancaria|banco)\b/.test(etiqueta)
}

export function solicitudPrivada(consulta: string) {
  const q = normalizar(consulta)
  return /\b(crea|crear|creame|creemos|registra|registrar|agrega|agregar|modifica|modificar|cambia|cambiar|edita|editar|elimina|eliminar|borra|borrar|habilita|habilitar|activa|activar|revoca|revocar|restablece|restablecer|invita|invitar)\b/.test(q)
    && /\b(usuario|usuarios|cuenta|cuentas|contrasena|contrasenas|password|permisos|rol|roles|rut|nombre|contacto|correo|email|telefono|direccion|datos personales|datos privados|acceso al portal)\b/.test(q)
}

export const avisoPrivacidad = 'La gestión de usuarios, accesos y datos personales queda fuera de las acciones del asistente. Puedes realizarla manualmente con los permisos correspondientes. Puedo ayudarte con las vistas y la gestión operativa, previa autorización.'

/** Defensa adicional para textos libres; los campos privados también se excluyen por estructura en la interfaz. */
export function ocultarDatosPrivados(texto: string) {
  const ruts: string[] = []
  const protegido = texto.replace(/\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[\dkK]\b/g, rut => { ruts.push(rut); return `__RUT${ruts.length - 1}__` })
  return protegido
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo privado]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token privado]')
    .replace(/\b(?:contrase[ñn]a|password|token|secreto|direcci[oó]n|tel[eé]fono|celular|correo|email|cuenta bancaria|cuenta de origen|cuenta receptora)\s*[:=]\s*[^\n|]+/gi, '[dato privado]')
    .replace(/(?:\+?56[ -]?)?[29](?:[ -]?\d){8}\b/g, '[teléfono privado]')
    .replace(/__RUT(\d+)__/g, (original, i: string) => ruts[Number(i)] ?? original)
}
