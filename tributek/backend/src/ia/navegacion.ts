import { type AccionIa } from './acciones.js'

type Mensaje = { role: string, text: string }
const normalizar = (s: string) => s.replace(/[:;][-]?[dD)]+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
// Catálogo de vistas reales, sin inferir registros ni permisos desde el texto del usuario.
export const vistasAsistente = [
  { destino: '/admin', nombre: 'Inicio', alias: ['inicio', 'dashboard', 'panel principal'], detalle: 'Aquí puedes revisar el resumen del período y los vencimientos.' },
  { destino: '/admin/clientes', nombre: 'Clientes', alias: ['clientes', 'cartera de clientes', 'directorio de clientes'], detalle: 'Aquí puedes buscar clientes, registrarlos y editar sus datos.' },
  { destino: '/admin/obligaciones', nombre: 'Obligaciones', alias: ['obligaciones', 'seguimiento mensual'], detalle: 'Aquí puedes abrir la ficha mensual de cada cliente y revisar sus conceptos y montos.' },
  { destino: '/admin/facturacion', nombre: 'Facturación', alias: ['facturacion', 'facturas'], detalle: 'Aquí puedes revisar y registrar la facturación de servicios.' },
  { destino: '/admin/pagos', nombre: 'Pagos', alias: ['pagos', 'abonos'], detalle: 'Aquí puedes registrar y revisar los pagos recibidos.' },
  { destino: '/admin/postergaciones', nombre: 'Postergaciones', alias: ['postergaciones'], detalle: 'Aquí puedes revisar los saldos y vencimientos postergados.' },
  { destino: '/admin/formalizaciones', nombre: 'Constitución de empresas', alias: ['constitucion de empresas', 'constitucion', 'formalizaciones', 'formalizacion'], detalle: 'Aquí puedes seguir los pasos del proceso de constitución de cada empresa.' },
  { destino: '/admin/auditoria', nombre: 'Trazabilidad', alias: ['trazabilidad', 'auditoria', 'historial de cambios'], detalle: 'Aquí puedes revisar las acciones registradas y sus datos de auditoría, usando los filtros disponibles.' },
  { destino: '/admin/f29', nombre: 'Proyección F29', alias: ['proyeccion f29', 'proyeccion', 'f29', 'f 29', 'formulario 29'], detalle: 'Aquí puedes importar compras y ventas y revisar una proyección mensual; no envía declaraciones al SII.' },
  { destino: '/cliente', nombre: 'Inicio del portal', alias: ['inicio', 'portal', 'dashboard', 'panel principal'], detalle: 'Aquí puedes consultar la información habilitada para tu cuenta.' },
  { destino: '/cliente/presentaciones', nombre: 'Presentaciones', alias: ['presentaciones', 'asesorias'], detalle: 'Aquí puedes ver las presentaciones de los servicios.' },
  { destino: '/cliente#documentos', nombre: 'Documentos', alias: ['documentos', 'mis documentos'], detalle: 'Aquí puedes consultar la sección de documentos de tu portal.' },
  { destino: '/cliente/documentos/subir', nombre: 'Subir documentos', alias: ['subir documentos', 'cargar documentos'], detalle: 'Esta vista es introductoria; por sí sola todavía no permite enviar archivos.' },
  { destino: '/cliente/documentos/obtener', nombre: 'Obtener documentos', alias: ['obtener documentos', 'descargar documentos'], detalle: 'Esta vista contiene datos de ejemplo; todavía no consulta documentos del backend.' },
] as const

// Admite errores leves de escritura solo en nombres largos, incluida una transposición.
function cercano(a: string, b: string) {
  if (a === b) return true
  if (b.length < 7 || Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const distintos = [...a].flatMap((letra, i) => letra === b[i] ? [] : [i])
    if (distintos.length === 1) return true
    const [i, j] = distintos
    return distintos.length === 2 && j === i! + 1 && a[i!] === b[j!] && a[j!] === b[i!]
  }
  const [corta, larga] = a.length < b.length ? [a, b] : [b, a]
  let i = 0
  while (i < corta.length && corta[i] === larga[i]) i++
  return corta.slice(i) === larga.slice(i + 1)
}
function contiene(texto: string, alias: string) {
  const palabras = texto.split(' '), objetivo = alias.split(' ')
  return palabras.some((_, i) => objetivo.every((palabra, j) => cercano(palabras[i + j] ?? '', palabra)))
}
const lectura = /\b(ver|veamos|abrir|abre|abrelo|abramos|muestra|muestrame|mostrar|mostrarme|muestres|visualizar|visualicemos|llevame|ir|vamos|entrar|acceder)\b/
const ayuda = /\b(como|que es|para que|explica|explicame|que hace|que puedo hacer)\b/
const cancelacion = /\b(cancela|cancelar|olvida|detente)\b|^no\b/
const continuacion = (q: string) => /^(si+|si por favor|claro|ok|dale|adelante|abrelo|muestramela|en visualizar|visualizar|en ver|ver|estoy en (el )?(inicio|dashboard|panel principal))$/.test(q)

/** Resuelve peticiones de vistas y sus continuaciones antes del modelo. Solo propone navegación. */
export function navegarVista(consulta: string, ruta: string, historial: Mensaje[], admin: boolean): { respuesta: string, accion?: AccionIa } | undefined {
  let q = normalizar(consulta)
  if (/que vistas|que secciones|todas las vistas|vistas disponibles/.test(q)) return { respuesta: 'Estas son las vistas disponibles para tu rol: ' + vistasAsistente.filter(v => admin ? v.destino.startsWith('/admin') : v.destino.startsWith('/cliente')).map(v => v.nombre).join(', ') + '. Puedes pedirme abrir cualquiera.' }
  if (cancelacion.test(q)) return undefined
  if (continuacion(q)) {
    for (const mensaje of [...historial].reverse().filter(m => m.role === 'user')) {
      const anterior = normalizar(mensaje.text)
      if (cancelacion.test(anterior)) break
      if (continuacion(anterior)) continue
      // No resucitar una petición antigua después de cambiar de tema.
      if (lectura.test(anterior) && !ayuda.test(anterior)) q = anterior
      break
    }
  }
  const esAyuda = ayuda.test(q)
  if ((!lectura.test(q) && !esAyuda) || /\b(elimina|borra|guarda|modifica|no puedo|no funciona|error)\b/.test(q)) return undefined
  // El resumen y las fichas necesitan el reconocimiento específico por cliente/período.
  if (/estado general|resumen|panorama|como estan|\bficha\b|\b(datos|informacion|deuda|saldo|honorario)\b/.test(q)) return undefined
  const coincidencias = vistasAsistente.filter(v => v.alias.some(alias => contiene(q, alias)))
  const permitidas = coincidencias.filter(v => admin ? v.destino.startsWith('/admin') : v.destino.startsWith('/cliente'))
  const max = Math.max(0, ...permitidas.map(v => Math.max(...v.alias.filter(a => contiene(q, a)).map(a => a.length))))
  const precisas = permitidas.filter(v => v.alias.some(a => a.length === max && contiene(q, a)))
  const destinos = [...new Set(permitidas.map(v => v.destino))]
  // Los submódulos Documentos se resuelven por la expresión más específica.
  if (destinos.length > 1 && !destinos.every(d => d.startsWith('/cliente') && (d.includes('documentos') || d === '/cliente'))) return undefined
  const vista = precisas[0]
  if (!vista) return coincidencias.length ? { respuesta: 'Esa vista no está disponible para tu rol. Puedo orientarte sobre las secciones de tu portal.' } : undefined
  if (vista.destino === '/admin/f29' && (!/\b(vista|modulo|seccion)\b/.test(q) && (ruta === '/admin/f29' || /\b(cliente|rut|hoja)\b/.test(q)))) return undefined
  if (esAyuda) return { respuesta: `${vista.nombre}: ${vista.detalle}` }
  if (ruta === vista.destino) return { respuesta: `Ya estás en ${vista.nombre}. ${vista.detalle}` }
  return { respuesta: `Puedo abrir ${vista.nombre}. Autoriza el cambio de vista para continuar.`, accion: { tipo: 'navegar', destino: vista.destino } }
}
