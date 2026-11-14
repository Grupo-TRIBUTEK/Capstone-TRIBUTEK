import { controlPrivado, ocultarDatosPrivados } from './privacidad'
/** Puente con controles visibles. La IA solo recibe etiquetas, nunca valores privados ni acceso al DOM. */
export type ControlIa = { id: string, nombre: string, tipo: string, opciones?: string[] }
export type AccionIa = { tipo: 'navegar', destino: string } | { tipo: 'pulsar', control: string } | { tipo: 'rellenar', control: string, valor: string }
type Elemento = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement
export type CapturaInterfaz = { controles: ControlIa[], elementos: Map<string, { elemento: Elemento, firma: string }>, pagina: string }
const admin = ['/admin', '/admin/clientes', '/admin/obligaciones', '/admin/facturacion', '/admin/pagos', '/admin/f29', '/admin/postergaciones', '/admin/formalizaciones', '/admin/auditoria']
const cliente = ['/cliente', '/cliente/presentaciones', '/cliente#documentos', '/cliente/documentos/subir', '/cliente/documentos/obtener']
export const rutasPermitidas = (ruta: string) => ruta === '/admin' || ruta.startsWith('/admin/') ? admin : ruta === '/cliente' || ruta.startsWith('/cliente/') ? cliente : []

/** Segunda validación independiente del servidor. Nunca acepta URL, selectores o código arbitrarios. */
export function validarPropuesta(value: unknown, captura: Pick<CapturaInterfaz, 'controles'>, ruta: string): AccionIa | null {
  if (!value || typeof value !== 'object') return null
  const a = value as Record<string, unknown>
  if (a.tipo === 'navegar' && typeof a.destino === 'string' && rutasPermitidas(ruta).includes(a.destino))
    return { tipo: 'navegar', destino: a.destino }
  const c = captura.controles.find(c => c.id === a.control)
  if (!c || controlPrivado(c.nombre)) return null
  if (a.tipo === 'pulsar' && c.tipo === 'boton') return { tipo: 'pulsar', control: c.id }
  if (a.tipo === 'rellenar' && c.tipo !== 'boton' && typeof a.valor === 'string' && a.valor.length <= 1000 && (!c.opciones || c.opciones.includes(a.valor)))
    return { tipo: 'rellenar', control: c.id, valor: a.valor }
  return null
}

function visible(e: Elemento) {
  const modal = document.querySelector('dialog[open]')
  return e.isConnected && !('disabled' in e && e.disabled) && !e.closest('[data-ia-assistant], [data-ia-exclude], [data-ia-protected], [data-ia-private], [hidden], [inert], [aria-hidden="true"]') &&
    (!modal || modal.contains(e)) && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).opacity !== '0'
}
function nombre(e: Elemento) {
  const labels = 'labels' in e ? Array.from(e.labels ?? []).map(l => l.textContent?.trim()).join(' ') : ''
  const base = e.getAttribute('aria-label') || labels || (e instanceof HTMLButtonElement || e.tagName === 'SUMMARY' ? e.textContent : '') || e.getAttribute('placeholder') || e.getAttribute('name') || ''
  const fila = e.closest('tr') ? filaOperativa(e.closest('tr')!) : ''
  const toggle = e instanceof HTMLInputElement && ['checkbox', 'radio'].includes(e.type) ? `${e.checked ? 'Desmarcar' : 'Marcar'} ` : ''
  return ocultarDatosPrivados(`${toggle}${base.trim()}${fila ? ` — ${fila}` : ''}`).slice(0, 300)
}
function firma(e: Elemento) {
  return JSON.stringify([nombre(e), e.getAttribute('type'), e.getAttribute('min'), e.getAttribute('max'), 'value' in e ? e.value : null,
    e instanceof HTMLInputElement ? e.checked : null,
    e instanceof HTMLSelectElement ? Array.from(e.options).map(o => [o.value, o.disabled]) : null])
}
function pagina() {
  return Array.from(document.querySelectorAll('main h1, main h2, main .tk-subtle, [role="dialog"] h2')).map(e => e.textContent).join('|')
}

/** Conserva referencias locales y una huella para impedir acciones sobre un cliente o campo que haya cambiado. */
export function capturarInterfaz(): CapturaInterfaz {
  const elementos: CapturaInterfaz['elementos'] = new Map()
  const controles: ControlIa[] = []
  const candidatos = document.querySelectorAll<Elemento>('button, input, textarea, select, details > summary')
  for (const e of candidatos) {
    if (controles.length >= 100 || !visible(e) || ('readOnly' in e && e.readOnly)) continue
    const tipoInput = e instanceof HTMLInputElement ? e.type : ''
    if (e instanceof HTMLInputElement && !['text', 'search', 'number', 'date', 'month', 'email', 'tel', 'checkbox', 'radio'].includes(tipoInput)) continue
    const etiqueta = nombre(e)
    if (controlPrivado(etiqueta)) continue
    if (!etiqueta || /contrase[ñn]a|password|token|cerrar sesi[oó]n|permisos|rol de|roles de/i.test(etiqueta)) continue
    const tipo = e instanceof HTMLButtonElement || e.tagName === 'SUMMARY' || ['checkbox', 'radio'].includes(tipoInput) ? 'boton' :
      e instanceof HTMLSelectElement ? 'seleccion' : tipoInput === 'number' ? 'numero' : tipoInput === 'date' ? 'fecha' : tipoInput === 'month' ? 'mes' : 'texto'
    const id = `control-${controles.length + 1}`
    const opciones = e instanceof HTMLSelectElement ? Array.from(e.options).filter(o => !o.disabled).map(o => o.value) : undefined
    if (opciones && (opciones.length > 100 || opciones.some(v => v.length > 200))) continue
    controles.push({ id, nombre: etiqueta, tipo, ...(opciones ? { opciones } : {}) })
    elementos.set(id, { elemento: e, firma: firma(e) })
  }
  return { controles, elementos, pagina: pagina() }
}

/** Comprueba que la pantalla y el destino siguen correspondiendo a lo que se va a confirmar. */
export function comprobarDestino(captura: CapturaInterfaz, accion: AccionIa) {
  if (pagina() !== captura.pagina) throw new Error('La pantalla cambió. Vuelve a solicitar la acción.')
  if (accion.tipo === 'navegar') return null
  const original = captura.elementos.get(accion.control)
  if (!original || !visible(original.elemento) || controlPrivado(nombre(original.elemento)) || original.elemento.closest('[data-ia-protected], [data-ia-private]') || firma(original.elemento) !== original.firma)
    throw new Error('El control cambió o ya no está disponible. Vuelve a solicitar la acción.')
  return original.elemento
}

/** Solo se llama después de confirmar. React recibe los mismos eventos que al editar manualmente. */
export function ejecutarControl(captura: CapturaInterfaz, accion: Exclude<AccionIa, { tipo: 'navegar' }>) {
  const e = comprobarDestino(captura, accion)!
  e.scrollIntoView({ block: 'center', behavior: 'smooth' })
  e.focus()
  if (accion.tipo === 'pulsar') {
    e.click()
    return
  }
  if (!(e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement)) throw new Error('Este control no admite texto.')
  const prototype = e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const anterior = e.value
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(e, accion.valor)
  if (e.value !== accion.valor || !e.checkValidity()) {
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(e, anterior)
    throw new Error('El valor no cumple el formato o los límites del campo. No se aplicó el cambio.')
  }
  e.dispatchEvent(new Event('input', { bubbles: true }))
  e.dispatchEvent(new Event('change', { bubbles: true }))
}

const privados = '[data-ia-assistant], [data-ia-exclude], [data-ia-protected], [data-ia-private], [hidden], [inert], [aria-hidden="true"]'
function visibleParaLectura(e: Element) {
  return !e.closest(privados) && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'
}
function textoOperativo(e: Element) {
  const etiqueta = e.querySelector('span, label')?.textContent?.trim() ?? ''
  if (controlPrivado(etiqueta)) return ''
  const copia = e.cloneNode(true) as Element
  copia.querySelectorAll(`${privados}, input, textarea, select`).forEach(n => n.remove())
  return ocultarDatosPrivados(copia.textContent?.replace(/\s+/g, ' ').trim() ?? '')
}
function columnaOperativa(nombre: string) {
  const titulo = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/contacto|correo|email|telefono|direccion|usuario|cuenta|banco|nota|observacion|detalle|glosa/.test(titulo)) return false
  return /cliente|rut|contribuyente|periodo|mes|estado|concepto|monto|total|saldo|deuda|honorario|fecha|vencimiento|servicio|accion|resultado|tipo|documento|folio|neto|iva|exento|maquina/.test(titulo)
}
function filaOperativa(fila: Element) {
  const cabeceras = Array.from(fila.closest('table')?.querySelectorAll('thead tr:first-child th') ?? [])
  return Array.from(fila.children).flatMap((celda, i) => columnaOperativa(cabeceras[i]?.textContent ?? '') && visibleParaLectura(celda) ? [textoOperativo(celda)] : []).join(' ')
}

/** Contexto operativo de la pantalla actual, sin contactos, credenciales ni formularios personales. */
export function describirVista() {
  const titulos = Array.from(document.querySelectorAll('h1, h2, .tk-subtle, [role="alert"], [role="status"], .f29-error, .tk-error, .tk-empty, .tk-metric, .tk-line'))
    .filter(visibleParaLectura).slice(0, 25).map(textoOperativo)
  const filas = Array.from(document.querySelectorAll('table tbody tr')).filter(visibleParaLectura).slice(0, 25).map(filaOperativa)
  const campos = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[type="number"], input[type="date"], input[type="month"], select'))
    .filter(e => visibleParaLectura(e) && !controlPrivado(nombre(e))).slice(0, 20).map(e => `${nombre(e)}: ${ocultarDatosPrivados(e instanceof HTMLSelectElement ? e.selectedOptions[0]?.textContent ?? '' : e.value)}`)
  return ['Contexto parcial de la pantalla actual; no es toda la base de datos. Los datos privados se omiten.', ...titulos, ...filas, ...campos].filter(Boolean).join('\n').slice(0, 5000)
}
