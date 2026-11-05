import { describe, it, expect } from 'vitest'
import { conversar, evitarBucle } from './conversacion.js'
describe('Conversación amable', () => {
  it.each(['Hola!', 'holaaa', 'buenos días', '¿Cómo estás?', 'gracias', '¿Qué puedes hacer?'])('responde a %s', q => expect(conversar(q)).toBeTruthy())
  it('no pierde una solicitud acompañada de saludo o agradecimiento', () => {
    expect(conversar('Hola, abre F29')).toBeUndefined()
    expect(conversar('Gracias, ahora busca al cliente C')).toBeUndefined()
  })
  it('cambia una aclaración repetida por caminos concretos', () => {
    const respuesta = 'No entiendo. ¿Qué estado de clientes necesitas?'
    const historial = [{ role: 'user', text: 'Estado de los clientes' }, { role: 'assistant', text: respuesta }]
    expect(evitarBucle(respuesta, 'sí', historial)).toContain('estado general de los clientes')
    expect(evitarBucle(respuesta, 'sí', historial)).not.toBe(respuesta)
    expect(evitarBucle(respuesta, 'repite por favor', historial)).toBe(respuesta)
  })
  it('conserva respuestas nuevas y respuestas informativas repetidas', () => {
    expect(evitarBucle('Hay cuatro clientes.', 'sí', [{ role: 'assistant', text: 'Hay cuatro clientes.' }])).toBe('Hay cuatro clientes.')
    expect(evitarBucle('¿Qué cliente?', 'abre una ficha', [])).toBe('¿Qué cliente?')
  })
})
