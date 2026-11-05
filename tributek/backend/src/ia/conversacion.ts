type Mensaje = { role: string, text: string }
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim()

/** Responde a saludos completos sin interceptar solicitudes que los acompañan. */
export function conversar(consulta: string) {
  const q = normalizar(consulta)
  if (/^(hola+|holi+|buenas|buenos dias|buenas tardes|buenas noches)( asistente)?$/.test(q))
    return '¡Hola! 😊 Estoy aquí para ayudarte. Podemos revisar clientes, abrir una ficha o resolver una duda de TRIBUTEK. Cuéntame qué necesitas.'
  if (/^(como estas|como estas hoy|que tal estas)$/.test(q))
    return '¡Listo para ayudarte! 😊 ¿Revisamos algo del sistema o tienes alguna otra pregunta?'
  if (/^(muchas gracias|gracias|gracias por la ayuda|super gracias)$/.test(q))
    return '¡De nada! Me alegra ayudarte. Cuando quieras, seguimos con lo que necesites.'
  if (/^(que puedes hacer|en que me puedes ayudar|ayuda|ayudame)$/.test(q))
    return 'Puedo ayudarte a:\n• Buscar clientes y abrir sus fichas o proyecciones F29.\n• Explicar conceptos y pasos del sistema.\n• Revisar los avisos visibles y orientarte ante un problema.\n• Resumir información que tenga disponible y ayudarte a redactar.\nAntes de actuar en la interfaz te pediré autorización. ¿Con qué empezamos?'
  return undefined
}

/** Evita repetir una aclaración idéntica. No altera respuestas con acciones ni repeticiones solicitadas. */
export function evitarBucle(respuesta: string, consulta: string, historial: Mensaje[]) {
  if (/repite|repetir|otra vez/.test(normalizar(consulta))) return respuesta
  const anterior = [...historial].reverse().find(m => m.role === 'assistant')?.text
  if (!anterior || normalizar(anterior) !== normalizar(respuesta) || !/\?|no entiendo|puedes especificar/i.test(respuesta)) return respuesta
  const tema = normalizar(historial.filter(m => m.role === 'user').slice(-3).map(m => m.text).join(' ') + ' ' + consulta)
  if (/cliente/.test(tema)) return 'Perdón, te estaba haciendo repetir la misma aclaración. Podemos revisar el resumen de los clientes o la ficha de uno en particular. Escribe «estado general de los clientes» para el resumen, o indícame el nombre o RUT para una ficha.'
  if (/csv|rcv|f29/.test(tema)) return 'Perdón, repetí la aclaración. Podemos abrir una proyección F29 indicando el cliente, o revisar un archivo que no se detecta con su nombre y período. No hace falta repetir toda la conversación.'
  return 'Perdón, repetí la misma pregunta. Para avanzar, dime el resultado que buscas, por ejemplo abrir una vista, entender un concepto o resolver un error. Si es un error, basta con su mensaje exacto.'
}
