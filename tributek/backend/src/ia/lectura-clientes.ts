/** Lectura acotada de filas visibles. No consulta la base ni ejecuta acciones. */
type ClienteVisible = { nombre: string, rut: string, deudaAcumulada?: string, estadoMes?: string, estado?: string, honorario?: string }
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim()
const rutNormalizado = (s: string) => s.replace(/[.\s]/g, '').toUpperCase()
const campos = ['deudaAcumulada', 'estadoMes', 'estado', 'honorario'] as const
const ruts = (s: string) => [...s.matchAll(/\b(?:\d{1,2}\.\d{3}\.\d{3}|\d{7,8})-[\dkK]\b/g)].map(m => rutNormalizado(m[0]))

export function consultarClientes(consulta: string, ruta: string, vista: string, admin: boolean): { respuesta: string, accion?: { tipo: 'navegar', destino: string } } | undefined {
  const q = normalizar(consulta)
  if (/^(no|cancela|cancelar|olvida|detente)\b|\b(como|que es|por que)\b/.test(q)) return undefined
  const pideDatos = /\b(datos|informacion|estado|deuda|debe|saldo|honorario|rut|nombre|lista|listado|quienes|cuantos|correo|email|telefono|direccion|contacto)\b/.test(q)
  if (!pideDatos || /\b(f29|proyeccion|factura|facturas|trazabilidad|auditoria)\b/.test(q) || /\b(como|explica|explicame|modifica|cambia|edita|elimina|borra|guarda)\b|que es|para que/.test(q)) return undefined
  if (!/\bclientes?\b/.test(q) && !['/admin/clientes', '/admin/obligaciones'].includes(ruta)) return undefined
  if (!admin) return { respuesta: 'La consulta de la cartera de clientes requiere una sesión administrativa. Puedo ayudarte con las presentaciones de tu portal.' }
  if (!['/admin/clientes', '/admin/obligaciones'].includes(ruta)) return { respuesta: 'Para consultar esos datos necesito el listado visible de Clientes. Puedes autorizar que lo abra.', accion: { tipo: 'navegar', destino: '/admin/clientes' } }
  if (/\b(correo|email|telefono|direccion|contrasena|credenciales|contacto)\b/.test(q)) return { respuesta: 'No tengo acceso a los datos privados de contacto o credenciales. Puedo consultar el nombre, RUT y los estados y montos operativos que aparecen en el listado.' }
  const raw = vista.split('\n').find(line => line.startsWith('Clientes visibles: '))?.slice('Clientes visibles: '.length)
  let clientes: ClienteVisible[] = []
  try {
    const value: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(value)) clientes = value.slice(0, 25).flatMap((c: unknown) => {
      if (!c || typeof c !== 'object') return []
      const row = c as Record<string, unknown>
      if (typeof row.nombre !== 'string' || !row.nombre.trim() || row.nombre.length > 200 || typeof row.rut !== 'string' || !/^\d{7,8}-[\dK]$/.test(rutNormalizado(row.rut))) return []
      const cliente: ClienteVisible = { nombre: row.nombre, rut: row.rut }
      for (const key of campos) if (typeof row[key] === 'string' && row[key].length <= 120) cliente[key] = row[key]
      return [cliente]
    })
  } catch { /* Una captura incompleta no es evidencia de ausencia de clientes. */ }
  if (!clientes.length) {
    // Mantiene el resumen existente basado en controles cuando todavía no hay captura estructurada.
    if (/estado general|resumen|panorama|como estan/.test(q)) return undefined
    return { respuesta: 'No recibí filas de clientes para consultar en esta pantalla. Revisa los filtros y la carga del listado. Esto no significa que no existan en la base de datos.' }
  }
  const rut = ruts(consulta).at(-1)
  const general = !rut && /\b(los clientes|mis clientes|todos los clientes|lista de clientes|listado de clientes|clientes visibles|cuantos clientes|quienes son los clientes)\b/.test(q)
  const palabras = q.split(' ')
  const irrelevantes = new Set(['cliente', 'clientes', 'comercial', 'servicios', 'spa', 'ltda', 'empresa', 'sociedad', 'datos', 'nombre', 'estado'])
  const puntuaciones = clientes.map(c => ({ cliente: c, puntos: normalizar(c.nombre).split(' ').filter(p => p.length >= 3 && !irrelevantes.has(p) && palabras.includes(p)).length }))
  const max = Math.max(0, ...puntuaciones.map(p => p.puntos))
  const coincidencias = general ? clientes : rut ? clientes.filter(c => rutNormalizado(c.rut) === rut) : puntuaciones.filter(p => p.puntos > 0 && p.puntos === max).map(p => p.cliente)
  if (!coincidencias.length) return { respuesta: /\bdel cliente|de |sobre |rut\b/.test(q)
    ? 'No identifico ese cliente entre las filas recibidas. Indícame su RUT o ajusta la búsqueda del listado. No puedo concluir que no exista en la base de datos.'
    : '¿De qué cliente necesitas los datos? Indícame su nombre o RUT, o pide «datos de los clientes» para consultar las filas visibles.' }
  if (!general && coincidencias.length > 1) return { respuesta: `Hay más de una coincidencia visible: ${coincidencias.map(c => `${c.nombre} (${c.rut})`).join(', ')}. Indícame el RUT para consultar la correcta.` }
  if (general && /\bcuantos\b/.test(q)) return { respuesta: `Recibí ${clientes.length} clientes en el listado visible. El conteo corresponde a los filtros y filas recibidas, no necesariamente a toda la base de datos.` }
  const soloDeuda = /deudas?|debe|saldos?/.test(q) && !/datos|informacion|estado/.test(q)
  const soloRut = /\brut\b/.test(q) && !rut && !/datos|informacion|estado/.test(q)
  const datos = coincidencias.map(c => {
    const lineas = [`${c.nombre} - RUT ${c.rut}`]
    if (!soloRut) {
      if (c.deudaAcumulada) lineas.push(`Deuda acumulada con TRIBUTEK: ${c.deudaAcumulada}`)
      if (!soloDeuda) {
        if (c.estadoMes) lineas.push(`Estado del mes: ${c.estadoMes}`)
        if (c.estado) lineas.push(`Estado del cliente: ${c.estado}`)
        if (c.honorario) lineas.push(`Honorario: ${c.honorario}`)
      }
      if (soloDeuda && !c.deudaAcumulada) lineas.push('La deuda no aparece en los datos recibidos.')
    }
    return lineas.join('\n')
  }).join('\n\n')
  return { respuesta: `${datos}\n\nDatos del listado visible y los filtros actuales. El estado del mes es distinto del estado del cliente.` }
}
