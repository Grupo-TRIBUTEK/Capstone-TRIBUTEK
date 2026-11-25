import { afterEach, describe, expect, it, vi } from 'vitest'
import { consultarClientes } from './lectura-clientes.js'
import { navegarVista } from './navegacion.js'
import { IaService } from './ia.service.js'
const clientes = [
  { nombre: 'Antonella Aguilar', rut: '21334566-9', deudaAcumulada: '$ 0', estadoMes: 'NO ENVIADO', estado: 'Activo', honorario: '$ 25.000' },
  { nombre: 'Camila Andrea Fuentes Rojas', rut: '17842693-1', deudaAcumulada: '$ 15.000', estadoMes: 'NO ENVIADO', estado: 'Activo', honorario: '$ 30.000' },
]
const vista = `Contexto parcial\nClientes visibles: ${JSON.stringify(clientes)}`
afterEach(() => vi.restoreAllMocks())
describe('Lectura precisa de clientes visibles', () => {
  it.each(['Muéstrame los datos del cliente Antonella', 'Dame información de Antonella', 'Quiero ver los datos de Antonella Aguilar'])('responde a %s sin navegar ni llamar al modelo', async consulta => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const result = await new IaService().consultar({ consulta, contexto: '/admin/clientes', controles: [], vista }, true)
    expect(result.respuesta).toContain('Antonella Aguilar - RUT 21334566-9')
    expect(result.respuesta).toContain('Estado del mes: NO ENVIADO')
    expect(result.respuesta).toContain('Estado del cliente: Activo')
    expect(result.respuesta).not.toContain('Camila')
    expect(result.respuesta).not.toContain('Ya estás')
    expect(result).not.toHaveProperty('accion')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('distingue navegar de consultar y conserva las confirmaciones para acciones', () => {
    expect(navegarVista('Muéstrame los datos de los clientes', '/admin/clientes', [], true)).toBeUndefined()
    expect(navegarVista('Abre la vista de Clientes', '/admin', [], true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/clientes' })
    expect(consultarClientes('Dame los datos del cliente Antonella', '/admin', '', true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/clientes' })
  })
  it('consulta por RUT con puntos y no atribuye los importes de otro cliente', () => {
    const result = consultarClientes('Dame los datos del cliente 17.842.693-1', '/admin/clientes', vista, true)
    expect(result?.respuesta).toContain('Camila Andrea Fuentes Rojas')
    expect(result?.respuesta).toContain('Deuda acumulada con TRIBUTEK: $ 15.000')
    expect(result?.respuesta).not.toContain('Antonella')
  })
  it('responde solo la deuda cuando esa es la pregunta y no inventa valores', () => {
    const result = consultarClientes('Cuánto debe Camila', '/admin/clientes', vista, true)
    expect(result?.respuesta).toContain('$ 15.000')
    expect(result?.respuesta).not.toContain('Honorario:')
    expect(consultarClientes('Cuánto debe Antonella', '/admin/clientes', `Clientes visibles: ${JSON.stringify([{ nombre: 'Antonella', rut: '21334566-9' }])}`, true)?.respuesta).toContain('no aparece')
  })
  it('pregunta el RUT ante coincidencias ambiguas y prefiere el nombre más preciso', () => {
    const doble = `Clientes visibles: ${JSON.stringify([...clientes, { ...clientes[0], nombre: 'Antonella Soto', rut: '17842693-1' }])}`
    expect(consultarClientes('Datos de Antonella', '/admin/clientes', doble, true)?.respuesta).toContain('más de una')
    expect(consultarClientes('Datos de Antonella Aguilar', '/admin/clientes', doble, true)?.respuesta).not.toContain('Antonella Soto')
  })
  it('no sustituye una identidad nueva por otra ni afirma inexistencia en la base', () => {
    expect(consultarClientes('Datos del cliente Pedro', '/admin/clientes', vista, true)?.respuesta).toContain('No identifico')
    expect(consultarClientes('Datos del cliente 11111111-1', '/admin/clientes', vista, true)?.respuesta).not.toContain('Camila')
  })
  it('limita los listados y los conteos a las filas recibidas', () => {
    expect(consultarClientes('Muéstrame datos de los clientes', '/admin/clientes', vista, true)?.respuesta).toContain('Antonella')
    expect(consultarClientes('Cuántos clientes tengo', '/admin/clientes', vista, true)?.respuesta).toContain('2 clientes')
    expect(consultarClientes('Dame datos del cliente Antonella', '/admin/clientes', 'Clientes visibles: [', true)?.respuesta).toContain('No recibí filas')
  })
  it('no expone contactos ni permite a clientes consultar la cartera administrativa', async () => {
    const privada = `Clientes visibles: ${JSON.stringify([{ ...clientes[0], email: 'privado@example.com', telefono: '912345678', password: 'secreto' }])}`
    expect(consultarClientes('Datos de Antonella', '/admin/clientes', privada, true)?.respuesta).not.toMatch(/privado@example|912345678|secreto/)
    expect(consultarClientes('Datos del cliente Antonella', '/admin/clientes', privada, false)?.respuesta).not.toContain('21334566')
    expect(consultarClientes('Correo del cliente Antonella', '/admin/clientes', privada, true)?.respuesta).toContain('privados')
    const result = await new IaService().consultar({ consulta: 'Modifica el correo del cliente Antonella', contexto: '/admin/clientes', controles: [], vista }, true)
    expect(result).not.toHaveProperty('accion')
    expect(result.respuesta).toContain('fuera de las acciones')
  })
})
