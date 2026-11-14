import { describe, expect, it, vi, afterEach } from 'vitest'
import { navegarVista, vistasAsistente } from './navegacion.js'
import { IaService } from './ia.service.js'

afterEach(() => vi.restoreAllMocks())
describe('Navegación de todas las vistas', () => {
  it.each(vistasAsistente)('reconoce $nombre ($destino) respetando el rol', vista => {
    const admin = vista.destino.startsWith('/admin')
    expect(navegarVista(`Quiero abrir la vista de ${vista.nombre}`, '/otra', [], admin)?.accion)
      .toEqual({ tipo: 'navegar', destino: vista.destino })
  })
  it.each(['Me gustaría que veamos la vista de trazbailidad', '¿Puedes mostrarme la vista de trazabilidad?', 'Hola, llévame a Auditoría', 'Visualicemos el historial de cambios'])('entiende %s', consulta => {
    expect(navegarVista(consulta, '/admin', [], true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/auditoria' })
  })
  it.each(['en visualizar', ':D estoy en Inicio', 'sí', 'ábrelo'])('retoma la solicitud pendiente con %s', consulta => {
    const historial = [
      { role: 'user', text: '¿Puedes mostrarme la vista de trazabilidad?' },
      { role: 'assistant', text: '¿En qué área estás?' },
      { role: 'user', text: 'en visualizar' },
      { role: 'assistant', text: '¿En qué área estás?' },
    ]
    expect(navegarVista(consulta, '/admin', historial, true)?.accion).toEqual({ tipo: 'navegar', destino: '/admin/auditoria' })
  })
  it('no vuelve a navegar si ya está en la vista ni pregunta un cliente innecesariamente', () => {
    const result = navegarVista('Muéstrame trazabilidad', '/admin/auditoria', [], true)
    expect(result?.accion).toBeUndefined()
    expect(result?.respuesta).toContain('Ya estás en Trazabilidad')
    expect(result?.respuesta).not.toContain('?')
  })
  it('no hereda una intención después de cancelar o cambiar de tema', () => {
    for (const nueva of ['cancela', 'explícame qué es el IVA']) {
      expect(navegarVista('sí', '/admin', [{ role: 'user', text: 'Abre pagos' }, { role: 'user', text: nueva }], true)).toBeUndefined()
    }
  })
  it('explica una vista sin navegar y rechaza vistas administrativas en el portal', () => {
    expect(navegarVista('¿Para qué sirve trazabilidad?', '/admin', [], true)?.accion).toBeUndefined()
    expect(navegarVista('¿Para qué sirve trazabilidad?', '/admin', [], true)?.respuesta).toContain('acciones registradas')
    expect(navegarVista('Abre auditoría', '/cliente', [], false)?.accion).toBeUndefined()
    expect(navegarVista('Abre pagos', '/admin', [], false)?.accion).toBeUndefined()
  })
  it('no elige entre dos destinos ni confunde una explicación con una orden', () => {
    expect(navegarVista('Abre pagos y clientes', '/admin', [], true)).toBeUndefined()
    expect(navegarVista('No abras auditoría', '/admin', [], true)).toBeUndefined()
    expect(navegarVista('¿Cómo abrir clientes?', '/admin', [], true)?.accion).toBeUndefined()
  })
  it('responde sin Ollama aun cuando no recibe controles', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const start = performance.now()
    expect(await new IaService().consultar({ consulta: 'Me gustaría que veamos trazbailidad', contexto: '/admin' }, true))
      .toMatchObject({ accion: { tipo: 'navegar', destino: '/admin/auditoria' } })
    expect(fetch).not.toHaveBeenCalled()
    expect(performance.now() - start).toBeLessThan(1000)
  })
  it('mantiene el modelo caliente y acota las respuestas generadas', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ response: 'Una respuesta breve.', model: 'qwen3:4b-instruct' }))
    await new IaService().consultar({ consulta: 'Explica qué es un asiento contable' }, true)
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))
    expect(body.keep_alive).toBe('15m')
    expect(body.options).toMatchObject({ num_predict: 384, num_ctx: 4096 })
  })
})
