/** Contrato limitado de propuestas. Nunca ejecuta código ni modifica la base de datos. */
export type ControlIa = { id: string, nombre: string, tipo: string, opciones?: string[] }
export type AccionIa =
  | { tipo: 'navegar', destino: string }
  | { tipo: 'pulsar', control: string }
  | { tipo: 'rellenar', control: string, valor: string }

export const rutasAdmin = ['/admin', '/admin/clientes', '/admin/obligaciones', '/admin/facturacion', '/admin/pagos', '/admin/f29', '/admin/postergaciones', '/admin/formalizaciones', '/admin/auditoria']
export const rutasCliente = ['/cliente', '/cliente/presentaciones', '/cliente#documentos']

/** Rechaza propuestas inventadas, rutas externas y valores fuera del catálogo recibido. */
export function validarAccion(value: unknown, controles: ControlIa[], rutas: string[]): AccionIa | undefined {
  if (!value || typeof value !== 'object') return undefined
  const a = value as Record<string, unknown>
  if (a.tipo === 'navegar' && typeof a.destino === 'string' && rutas.includes(a.destino))
    return { tipo: 'navegar', destino: a.destino }
  const control = controles.find(c => c.id === a.control)
  if (!control) return undefined
  if (a.tipo === 'pulsar' && control.tipo === 'boton') return { tipo: 'pulsar', control: control.id }
  if (a.tipo === 'rellenar' && control.tipo !== 'boton' && typeof a.valor === 'string' && a.valor.length <= 1000 &&
      (!control.opciones || control.opciones.includes(a.valor)))
    return { tipo: 'rellenar', control: control.id, valor: a.valor }
  return undefined
}

/** Resuelve la petición de demostración sin depender de que el modelo esté disponible. */
export function pideF29(consulta: string) {
  const q = consulta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').trim()
  return /^(?:por favor )?(?:muestrame|mostrar|abre|abrir|ver|quiero ver|llevame a) (?:un |el |la |una )?(?:formulario ?29|f ?29|proyeccion f ?29)(?: por favor)?$/.test(q)
}

/** Reconoce órdenes explícitas solo si el nombre coincide con un único control visible. */
export function ordenDirecta(consulta: string, controles: ControlIa[], rutas: string[]) {
  const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const texto = consulta.trim()
  const llenar = /^(?:escribe|pon|completa) (.+) en (.+)$/i.exec(texto)
  const pulsar = /^(?:pulsa|presiona|haz clic en) (.+)$/i.exec(texto)
  const nombre = llenar?.[2] ?? pulsar?.[1]
  if (!nombre) return undefined
  const candidatos = controles.filter(c => normalizar(c.nombre) === normalizar(nombre))
  if (candidatos.length !== 1) return undefined
  const control = candidatos[0]!.id
  return validarAccion(llenar ? { tipo: 'rellenar', control, valor: llenar[1] } : { tipo: 'pulsar', control }, controles, rutas)
}

/** Continúa F29 con el RUT indicado y exige una fila única, sin inventar registros. */
export function abrirF29(consulta: string, historial: { role: string, text: string }[], controles: ControlIa[]) {
  const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const q = normalizar(consulta)
  const anteriores = historial.filter(m => m.role === 'user').map(m => m.text)
  const contexto = normalizar([...anteriores, consulta].join(' '))
  if (/^(no|cancela|olvida)\b/.test(q) || !/formulario|f29|hoja|informe/.test(contexto)) return undefined
  if (!/abr|ver|visual|muestr|rut|^si[.! ]*$/.test(q)) return undefined
  const ruts = [...[...anteriores, consulta].join(' ').matchAll(/\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[\dkK]\b/g)]
  const rut = ruts.at(-1)?.[0].replaceAll('.', '').toLowerCase()
  const hojas = controles.filter(c => c.tipo === 'boton' && normalizar(c.nombre).startsWith('abrir hoja'))
  const coincidencias = rut ? hojas.filter(c => c.nombre.replaceAll('.', '').toLowerCase().includes(rut)) : hojas
  if (coincidencias.length === 1 && (rut || !/cliente/.test(contexto))) return {
    respuesta: 'Puedo abrir esta hoja de proyección F29 en el período seleccionado. Revisa el cliente en la confirmación.',
    accion: { tipo: 'pulsar', control: coincidencias[0]!.id },
  }
  const informe = controles.find(c => c.tipo === 'boton' && c.nombre === 'Ver informe')
  if (informe && /informe|vista previa/.test(q)) return { respuesta: 'Puedo abrir la vista previa de la hoja actual.', accion: { tipo: 'pulsar', control: informe.id } }
  const filtro = controles.find(c => c.tipo === 'texto' && c.nombre === 'Buscar cliente o RUT')
  if (rut && filtro) {
    const yaBusco = historial.some(m => m.role === 'assistant' && m.text.includes(`Buscaré el RUT ${rut}`))
    if (yaBusco) return { respuesta: `No aparece una hoja visible para el RUT ${rut}. Revisa si está incorporado al módulo F29 mediante «Traer clientes de TRIBUTEK». No abriré otro cliente en su lugar.` }
    return { respuesta: `Buscaré el RUT ${rut} en el listado. Después de autorizar, dime «abre su hoja» para continuar con el resultado.`, accion: { tipo: 'rellenar', control: filtro.id, valor: rut } }
  }
  return undefined
}
