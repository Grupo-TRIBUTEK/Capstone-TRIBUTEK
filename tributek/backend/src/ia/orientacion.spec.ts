import { describe, it, expect } from 'vitest'
import { orientar } from './orientacion.js'
const controles = [
  { id: 'c', nombre: 'Abrir hoja — Cliente C 33333333-3 Pendiente', tipo: 'boton' },
  { id: 'a', nombre: 'Abrir hoja — Cliente A 11111111-1 Pendiente', tipo: 'boton' },
  { id: 'buscar', nombre: 'Buscar cliente o RUT', tipo: 'texto' },
]
const ejecutar = (q: string, historial: { role: string, text: string }[] = []) => orientar(q, '/admin/f29', controles, historial, true)
describe('Orientación del asistente', () => {
  it('pregunta el cliente ante un saludo con solicitud genérica', () => {
    expect(ejecutar('Hola, muéstrame un formulario 29')?.respuesta).toContain('¿De qué cliente')
    expect(ejecutar('Hola, muéstrame un formulario 29')?.accion).toBeUndefined()
  })
  it('abre por nombre completo y por RUT con puntos', () => {
    expect(ejecutar('Abre el F29 del cliente C')?.accion).toEqual({ tipo: 'pulsar', control: 'c' })
    expect(ejecutar('Muéstrame el F29 de 33.333.333-3')?.accion).toEqual({ tipo: 'pulsar', control: 'c' })
  })
  it('al cambiar de cliente no reutiliza el RUT anterior', () => {
    const historial = [{ role: 'user', text: 'Ver F29 de 33333333-3' }, { role: 'user', text: 'Abre el F29 del cliente A' }]
    expect(ejecutar('sí', historial)?.accion).toEqual({ tipo: 'pulsar', control: 'a' })
  })
  it('no convierte ayuda ni cancelaciones en acciones', () => {
    expect(ejecutar('No se detectan mis CSV')?.accion).toBeUndefined()
    expect(ejecutar('No se detectan mis CSV')?.respuesta).toContain('No cambies el nombre')
    expect(ejecutar('¿Cómo abrir un F29?')).toBeUndefined()
    expect(ejecutar('cancela')?.accion).toBeUndefined()
  })
  it('no escoge ante nombres duplicados', () => {
    const result = orientar('Ver F29 del Cliente C', '/admin/f29', [...controles, { id: 'otro', nombre: 'Abrir hoja — Cliente C 22222222-2', tipo: 'boton' }], [], true)
    expect(result?.accion).toBeUndefined()
    expect(result?.respuesta).toContain('más de una')
  })
  it('propone buscar un cliente ausente sin afirmar que no existe', () => {
    expect(ejecutar('Ver F29 del cliente Z')?.accion).toEqual({ tipo: 'rellenar', control: 'buscar', valor: 'Z' })
  })
  it('abre vista previa solo si está disponible', () => {
    expect(orientar('Muéstrame la vista previa', '/admin/f29', [{ id: 'informe', nombre: 'Ver informe', tipo: 'boton' }], [], true)?.accion).toEqual({ tipo: 'pulsar', control: 'informe' })
  })
  it('respeta el rol aunque se falsifique la ruta', () => {
    expect(orientar('Abre F29 del cliente C', '/admin/f29', controles, [], false)?.accion).toBeUndefined()
  })
  it('navega hacia la ficha mensual y secciones conocidas', () => {
    expect(orientar('Abre la ficha del cliente C', '/admin/clientes', [], [], true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/obligaciones' })
    expect(orientar('Llévame a pagos', '/admin', [], [], true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/pagos' })
  })
})
