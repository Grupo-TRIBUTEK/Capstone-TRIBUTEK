import { type AccionIa, type ControlIa, rutasAdmin, rutasCliente } from './acciones.js'

type Mensaje = { role: string, text: string }
type Propuesta = { respuesta: string, accion?: AccionIa }
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!,.]/g, '').replace(/\s+/g, ' ').trim()
const ruts = (s: string) => [...s.matchAll(/\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[\dkK]\b/g)].map(m => m[0].replaceAll('.', '').toLowerCase())
const vistas = [
  ['clientes', '/admin/clientes', 'Clientes'], ['obligaciones', '/admin/obligaciones', 'Obligaciones'],
  ['facturacion', '/admin/facturacion', 'Facturación'], ['pagos', '/admin/pagos', 'Pagos'],
  ['postergaciones', '/admin/postergaciones', 'Postergaciones'], ['trazabilidad', '/admin/auditoria', 'Trazabilidad'],
  ['auditoria', '/admin/auditoria', 'Trazabilidad'], ['constitucion', '/admin/formalizaciones', 'Constitución de empresas'],
  ['inicio', '/admin', 'Inicio'],
] as const

/** Resuelve navegación y lectura por identidad. No convierte preguntas de ayuda en cambios de datos. */
export function orientar(consulta: string, ruta: string, controles: ControlIa[], historial: Mensaje[], admin: boolean): Propuesta | undefined {
  const q = normalizar(consulta)
  // Las respuestas breves retoman la última solicitud sustantiva, sin volver a pedir lo mismo.
  const afirmacion = /^(si+|si+ por favor|claro|ok|dale|el estado general|si el estado general)$/.test(q)
  const ultimaSolicitud = [...historial].reverse().find(m => m.role === 'user' && !/^(si+|claro|ok|dale|si el estado general|el estado general)$/.test(normalizar(m.text)))?.text ?? ''
  const temaResumen = normalizar(afirmacion ? ultimaSolicitud : consulta)
  if (/clientes/.test(temaResumen) && /estado|resumen|panorama|como estan/.test(temaResumen)) {
    if (!admin) return { respuesta: 'El resumen de la cartera de clientes requiere una sesión administrativa. Puedo ayudarte con la información de tu portal.' }
    if (ruta !== '/admin/clientes') return {
      respuesta: 'Claro. Para revisar el estado general abriré Clientes, donde aparecen el estado y el seguimiento mensual. Necesito tu autorización para cambiar de vista.',
      accion: { tipo: 'navegar', destino: '/admin/clientes' },
    }
    const filas = controles.filter(c => c.tipo === 'boton' && c.nombre.startsWith('Editar — '))
    if (!filas.length) return { respuesta: 'No recibí filas de clientes para resumir en esta pantalla. Revisa los filtros y si aparece un error de carga. Esto no significa que no existan clientes en la base de datos.' }
    const unicos = new Map<string, string>()
    for (const fila of filas) {
      const rut = ruts(fila.nombre)[0]
      if (rut) unicos.set(rut, normalizar(fila.nombre))
    }
    if (!unicos.size) return { respuesta: 'Los controles recibidos no permiten identificar con seguridad los clientes. Revisa el listado y sus filtros antes de resumirlo.' }
    const estados = [...unicos.values()]
    const activos = estados.filter(e => /\bactivo\b/.test(e)).length
    const inactivos = estados.filter(e => /\binactivo\b/.test(e)).length
    const pendientes = estados.filter(e => /\bpendiente\b/.test(e)).length
    const noEnviados = estados.filter(e => /\bno enviado\b/.test(e)).length
    return { respuesta: `Resumen de los ${estados.length} clientes identificados en el listado visible:\n• Activos: ${activos}\n• Inactivos: ${inactivos}\n• Filas que indican pendiente: ${pendientes}\n• Seguimiento mensual «No enviado»: ${noEnviados}\nEl estado del cliente y el seguimiento mensual son conceptos distintos. Este resumen corresponde a las filas recibidas y los filtros actuales, no necesariamente a toda la cartera. Puedo ayudarte a abrir una ficha si me indicas el nombre o RUT.` }
  }

  if (/\b(csv|rcv)\b/.test(q) && /no se detect|no detect|no encuent|no aparece|no reconoce|no importa/.test(q)) return {
    respuesta: 'Revisa estos puntos:\n1. El período seleccionado debe coincidir con el mes real de los CSV. Si tus archivos son de septiembre de 2026, selecciona septiembre de 2026 (2026-09), no octubre. No cambies el nombre del CSV para hacerlo coincidir.\n2. Comprueba que el RUT del archivo corresponda al cliente abierto.\n3. Selecciona la carpeta o los CSV y vuelve a buscar los RCV.\nSi continúa el problema, indícame el nombre completo de un archivo y el mensaje mostrado. No puedo confirmar la causa sin esos datos.',
  }
  if (/no (se )?guard|desaparec/.test(q) && /monto|concepto|obligacion|ficha/.test(q)) return {
    respuesta: 'Para revisar el guardado:\n1. Confirma el cliente y el período de la ficha.\n2. Guarda y revisa si el aviso indica guardado en TRIBUTEK, solo guardado local o un error.\n3. Vuelve a abrir la misma ficha y período para comprobar el monto.\nSi desaparece, indícame el mensaje exacto. No vuelvas a registrar pagos ni borres datos para probar: primero debemos identificar dónde falla el guardado.',
  }
  if (/^(no|no gracias|cancelar|cancela|olvida|detente)[.! ]*$/.test(q)) return { respuesta: 'De acuerdo. No propongo ninguna acción. Dime qué necesitas revisar.' }
  const continuacion = /^(si+|si por favor|adelante|abrelo|abre su hoja|abre su ficha|continua|ese|esa)$/.test(q)
  const anteriores = historial.filter(m => m.role === 'user').map(m => m.text)
  const identidadAnterior = [...anteriores].reverse().find(m => /\bcliente\s+\S/i.test(m) || ruts(m).length > 0) ?? ''
  const identidadTexto = continuacion ? identidadAnterior : consulta
  const solicitud = continuacion ? [...anteriores.slice(-3), consulta].join(' ') : consulta
  const texto = normalizar(solicitud)
  const lectura = /\b(ver|vr|abrir|abre|abr[ae]lo|muestrame|mostrar|visualizar|visualizacion|buscar|busca|llevame|necesito ver|quiero ver)\b/.test(texto)
  if (!lectura || /\b(como|por que|no puedo|no funciona|error|elimina|borra|guarda|modifica)\b/.test(q)) return undefined
  const f29 = /formulario\s*29|f\s*29|proyeccion|hoja/.test(texto) || (ruta === '/admin/f29' && /cliente|informe|vista previa/.test(texto))
  const rutas = admin ? rutasAdmin : rutasCliente
  const navegar = (destino: string, nombre: string): Propuesta => rutas.includes(destino)
    ? { respuesta: `Puedo abrir ${nombre}. Después de autorizar, continuamos con el cliente o la tarea que necesites.`, accion: { tipo: 'navegar', destino } }
    : { respuesta: 'Tu sesión no tiene acceso a esa vista administrativa.' }
  if (f29 && ruta !== '/admin/f29') return navegar('/admin/f29', 'Proyección F29')
  if (f29 && !admin) return { respuesta: 'Tu sesión no tiene acceso a Proyección F29.' }
  if (f29 && /vista previa|informe/.test(q)) {
    const informe = controles.find(c => c.tipo === 'boton' && c.nombre === 'Ver informe')
    if (informe) return { respuesta: 'Puedo mostrar la vista previa de la proyección abierta.', accion: { tipo: 'pulsar', control: informe.id } }
  }
  const cliente = /cliente|ficha/.test(texto) || f29
  if (!cliente) {
    const vista = vistas.find(([nombre]) => texto.includes(nombre))
    if (vista) return ruta === vista[1] ? { respuesta: `Ya estás en ${vista[2]}. Dime qué necesitas revisar aquí.` } : navegar(vista[1], vista[2])
    return undefined
  }
  if (!admin) return undefined
  if (!f29 && !['/admin/clientes', '/admin/obligaciones', '/admin'].includes(ruta)) return navegar('/admin/clientes', 'Clientes')
  if (!f29 && /ficha/.test(texto) && ruta === '/admin/clientes') return navegar('/admin/obligaciones', 'Obligaciones, donde puedes abrir la ficha mensual')
  const controlesCliente = controles.filter(c => c.tipo === 'boton' && /^(abrir hoja|ver ficha|editar) — /i.test(c.nombre))
  const identidad = (c: ControlIa) => c.nombre.split(' — ')[1]?.split(/\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[\dkK]\b/)[0]?.trim() ?? ''
  const rut = ruts(identidadTexto).at(-1)
  const nombres = controlesCliente.filter(c => {
    const nombre = normalizar(identidad(c))
    return nombre && (` ${normalizar(identidadTexto)} `).includes(` ${nombre} `)
  })
  // Una identidad nueva nunca hereda el RUT de otra solicitud.
  const objetivo = rut
  const matches = objetivo ? controlesCliente.filter(c => ruts(c.nombre).includes(objetivo)) : nombres
  const abrir = matches.filter(c => f29 ? c.nombre.startsWith('Abrir hoja') : c.nombre.startsWith('Ver ficha'))
  if (abrir.length === 1) return { respuesta: `Puedo abrir ${identidad(abrir[0]!)} en el período seleccionado. Revisa los datos de la confirmación.`, accion: { tipo: 'pulsar', control: abrir[0]!.id } }
  if (matches.length > 1) return { respuesta: 'Hay más de una coincidencia visible. Indícame el RUT y el período para abrir la ficha correcta.' }
  const filtro = controles.find(c => c.tipo === 'texto' && c.nombre === 'Buscar cliente o RUT')
  const nombreSolicitado = /\bcliente\s+(.+?)(?:\s+(?:por favor|para|en el|del mes)|$)/i.exec(identidadTexto)?.[1]?.trim()
  const busqueda = objetivo ?? (matches[0] ? identidad(matches[0]) : nombreSolicitado)
  if (filtro && busqueda && busqueda.length <= 100) {
    const marcador = `Buscaré «${busqueda}»`
    if (historial.slice(-4).some(m => m.role === 'assistant' && m.text.startsWith(marcador))) return { respuesta: f29
      ? 'No encuentro una hoja coincidente entre los controles visibles. Revisa los filtros y si el cliente está incorporado a F29 con «Traer clientes de TRIBUTEK». No significa que el cliente no exista en la base de datos.'
      : 'La búsqueda ya fue solicitada. Revisa las filas y los filtros del listado. Para ver la ficha mensual, pídeme abrir Obligaciones.' }
    return { respuesta: `${marcador} en el listado. Autoriza la búsqueda y después dime «abre su hoja» o «abre su ficha» para continuar.`, accion: { tipo: 'rellenar', control: filtro.id, valor: busqueda } }
  }
  if (!f29 && ruta === '/admin') return navegar('/admin/clientes', 'Clientes')
  const opciones = [...new Set(controlesCliente.map(identidad).filter(Boolean))].slice(0, 5)
  return { respuesta: `¿De qué cliente quieres ${f29 ? 'abrir la proyección F29' : 'ver la información'}? Indícame su nombre o RUT.${opciones.length ? ` En la pantalla aparecen: ${opciones.join(', ')}.` : 'Solo puedo seleccionar controles disponibles en la vista actual.'}` }
}

/** Conocimiento del funcionamiento de la aplicación, sin afirmar diagnósticos de la base de datos. */
export const GUIA_TRIBUTEK = `TRIBUTEK administra clientes, obligaciones mensuales, pagos, facturación, postergaciones, constitución de empresas y trazabilidad.
Proyección F29 es una estimación interna, no una declaración enviada al SII. Abrir hoja muestra el borrador o proyección del cliente en el período seleccionado. Ver informe abre la vista previa. Guardar proyección solicita persistencia y debe comprobarse el aviso de resultado.
Los CSV RCV se relacionan por RUT y período del nombre. Ejemplo RCV_COMPRA_REGISTRO_11111111-1_202609 corresponde a septiembre de 2026. Si no se detectan, revisar RUT, período, selección de archivos y el mensaje visible. Nunca afirmar que falta la base de datos sin evidencia.
Configurar carpeta RCV abre permisos del navegador que la aplicación no puede diseñar. Seleccionar archivos no equivale a importar ni guardar la proyección. Traer clientes de TRIBUTEK incorpora el directorio al módulo F29.
En Clientes se busca por nombre o RUT y se editan datos. En Obligaciones se abre Ver ficha para revisar el período, conceptos y montos. Un aviso de guardado debe comprobarse al recargar antes de dar el problema por resuelto.
Ante un error de guardado, pide el mensaje concreto y comprueba cliente y período. No sugieras borrar la base, reiniciar migraciones o eliminar datos. No inventes tasas, vencimientos ni resultados contables.
Las acciones requieren confirmación humana. No puedes abrir el computador, instalar programas, ejecutar comandos ni cambiar permisos. Puedes orientar y proponer controles existentes. Si falta una función, dilo con claridad.`
