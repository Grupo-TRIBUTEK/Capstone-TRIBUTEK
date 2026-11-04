import { afterEach, describe, expect, it, vi } from 'vitest'
import { IaService } from './ia.service.js'
const service = new IaService()
afterEach(() => vi.restoreAllMocks())
describe('Asistente con interfaz', () => {
  it('abre F29 para administrador sin necesitar Ollama', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    expect(await service.consultar({ consulta: 'Muéstrame un formulario 29', controles: [] }, true)).toMatchObject({ accion: { tipo: 'navegar', destino: '/admin/f29' } })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('no concede acceso administrativo a un cliente que falsifica el contexto', async () => {
    const result = await service.consultar({ consulta: 'Muéstrame un formulario 29', contexto: '/admin', controles: [] }, false)
    expect(result).not.toHaveProperty('accion')
  })
  it('rechaza un destino inventado por el modelo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ response: JSON.stringify({ respuesta: 'Voy a abrirlo', accion: { tipo: 'navegar', destino: 'javascript:alert(1)' } }) }))
    expect(await service.consultar({ consulta: 'abrir', controles: [] }, true)).not.toHaveProperty('accion')
  })
  it('rechaza JSON mal formado sin realizar acciones', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ response: 'No es JSON' }))
    await expect(service.consultar({ consulta: 'abrir', controles: [] }, true)).rejects.toThrow('acción segura')
  })
})
