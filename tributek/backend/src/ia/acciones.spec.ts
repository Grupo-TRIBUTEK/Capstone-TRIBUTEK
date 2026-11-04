import { describe, it, expect } from 'vitest'
import { abrirF29, ordenDirecta, pideF29, rutasAdmin, rutasCliente, validarAccion } from './acciones.js'

const controles = [{ id: '1', nombre: 'Guardar cliente A', tipo: 'boton' }, { id: '2', nombre: 'Estado', tipo: 'seleccion', opciones: ['pendiente', 'pagado'] }]
describe('Propuestas del asistente', () => {
  it('reconoce la petición del profesor sin interpretar preguntas o negaciones como órdenes', () => {
    expect(pideF29('Muéstrame un formulario 29')).toBe(true)
    expect(pideF29('abre F29 por favor')).toBe(true)
    expect(pideF29('No abras F29')).toBe(false)
    expect(pideF29('¿Qué es un F29?')).toBe(false)
  })
  it('rechaza navegación administrativa para el portal de clientes y URLs externas', () => {
    expect(validarAccion({ tipo: 'navegar', destino: '/admin/f29' }, controles, rutasCliente)).toBeUndefined()
    for (const destino of ['javascript:alert(1)', 'https://otro.cl', '//otro.cl', '/admin/../login'])
      expect(validarAccion({ tipo: 'navegar', destino }, controles, rutasAdmin)).toBeUndefined()
  })
  it('rechaza controles y valores inventados', () => {
    expect(validarAccion({ tipo: 'pulsar', control: 'ausente' }, controles, rutasAdmin)).toBeUndefined()
    expect(validarAccion({ tipo: 'rellenar', control: '1', valor: 'x' }, controles, rutasAdmin)).toBeUndefined()
    expect(validarAccion({ tipo: 'rellenar', control: '2', valor: 'borrado' }, controles, rutasAdmin)).toBeUndefined()
    expect(validarAccion({ tipo: 'rellenar', control: '2', valor: 'pagado' }, controles, rutasAdmin)).toEqual({ tipo: 'rellenar', control: '2', valor: 'pagado' })
  })
})

it('interpreta órdenes exactas sin elegir entre campos ambiguos ni aceptar negaciones', () => {
  const campos = [{ id: 'filtro', nombre: 'Buscar cliente o RUT', tipo: 'texto' }]
  expect(ordenDirecta('Escribe QA en Buscar cliente o RUT', campos, rutasAdmin)).toEqual({ tipo: 'rellenar', control: 'filtro', valor: 'QA' })
  expect(ordenDirecta('No escribe QA en Buscar cliente o RUT', campos, rutasAdmin)).toBeUndefined()
  expect(ordenDirecta('Escribe QA en Buscar cliente o RUT', [...campos, ...campos], rutasAdmin)).toBeUndefined()
})

it('continúa la conversación con el RUT previo y abre solo su hoja', () => {
  const historial = [{ role: 'user', text: 'Quiero ver un formulario 29' }, { role: 'user', text: 'Su RUT es 33333333-3' }]
  const controles = [{ id: 'c', nombre: 'Abrir hoja — Cliente C 33333333-3 Pendiente', tipo: 'boton' }]
  expect(abrirF29('sí', historial, controles)?.accion).toEqual({ tipo: 'pulsar', control: 'c' })
  expect(abrirF29('no', historial, controles)).toBeUndefined()
  expect(abrirF29('abre su hoja', historial, [{ ...controles[0]!, nombre: 'Abrir hoja — Cliente A 11111111-1' }])).toBeUndefined()
})
it('ofrece filtrar un RUT ausente y permite abrir la vista previa existente', () => {
  const controles = [{ id: 'buscar', nombre: 'Buscar cliente o RUT', tipo: 'texto' }]
  expect(abrirF29('Ver formulario del RUT 33333333-3', [], controles)?.accion).toEqual({ tipo: 'rellenar', control: 'buscar', valor: '33333333-3' })
  expect(abrirF29('Muéstrame la vista previa del informe', [], [{ id: 'vista', nombre: 'Ver informe', tipo: 'boton' }])?.accion).toEqual({ tipo: 'pulsar', control: 'vista' })
})
