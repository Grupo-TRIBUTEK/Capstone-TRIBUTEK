import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { controlPrivado, ocultarDatosPrivados } from './privacidad.js'
import { validarAccion, rutasAdmin } from './acciones.js'
import { IaService } from './ia.service.js'
import { validarPropuesta } from '../../../frontend/app/components/ia/interfaz.js'

afterEach(() => vi.restoreAllMocks())
describe('Límites del asistente en datos personales', () => {
  it.each(['Crear usuario', 'Modificar usuario', 'Nuevo cliente', 'Guardar cliente', 'Editar — Camila 17842693-1', 'Email de contacto', 'Contacto principal', 'RUT', 'Nombre / Razón social', 'Dirección', 'Teléfono', 'Contraseña', 'Rol', 'Roles', 'Habilitar acceso al portal', 'Revocar acceso', 'Cuenta receptora (opcional)', 'Restaurar respaldo'])('no propone actuar sobre %s', nombre => {
    const controles = [{ id: 'privado', nombre, tipo: 'boton' }]
    expect(controlPrivado(nombre)).toBe(true)
    expect(validarAccion({ tipo: 'pulsar', control: 'privado' }, controles, rutasAdmin)).toBeUndefined()
  })
  it.each(['Ver ficha — Camila 17842693-1', 'Abrir hoja — Nicolás 16473852-3', 'Guardar conceptos', 'Guardar proyección', 'Registrar pago', 'Guardar postergación', 'Monto', 'Período de trabajo', 'Control de vencimientos', 'Buscar cliente o RUT'])('conserva la operación permitida %s', nombre => {
    expect(controlPrivado(nombre)).toBe(false)
  })
  it('oculta contactos y secretos, conservando nombre y RUT como identificadores', () => {
    const result = ocultarDatosPrivados('Camila 17842693-1 y Empresa 27842693-1\ncamila@example.com\n+56 9 1234 5678\nDirección: Calle Ejemplo 123\npassword=super-secreto')
    expect(result).toContain('Camila 17842693-1')
    expect(result).toContain('27842693-1')
    for (const privado of ['camila@example.com', '1234 5678', 'Calle Ejemplo', 'super-secreto']) expect(result).not.toContain(privado)
  })
  it.each(['Crea un usuario nuevo', 'Modifica el correo del cliente', 'Cambia el RUT', 'Restablece la contraseña'])('rechaza %s sin enviar datos a Ollama', async consulta => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const result = await new IaService().consultar({ consulta, controles: [] }, true)
    expect(result).not.toHaveProperty('accion')
    expect(result.respuesta).toContain('fuera de las acciones')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('filtra controles privados y oculta datos del historial antes de consultar al modelo', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ response: JSON.stringify({ respuesta: 'Puedo ayudarte con la proyección.', accion: { tipo: 'pulsar', control: 'privado' } }) }))
    const result = await new IaService().consultar({ consulta: 'Ayúdame con esta operación', contexto: '/admin/f29', controles: [{ id: 'privado', nombre: 'Modificar usuario', tipo: 'boton' }, { id: 'guardar', nombre: 'Guardar proyección', tipo: 'boton' }], historial: [{ role: 'user', text: 'Camila 17842693-1, camila@example.com' }], vista: 'Teléfono: +56 9 1234 5678' }, true)
    const enviado = String(fetch.mock.calls[0]?.[1]?.body)
    expect(enviado).not.toContain('camila@example.com')
    expect(enviado).not.toContain('1234 5678')
    expect(enviado).not.toContain('Modificar usuario')
    expect(enviado).toContain('Guardar proyección')
    expect(enviado).toContain('17842693-1')
    expect(result).not.toHaveProperty('accion')
  })
  it('mantiene idénticas las reglas independientes del navegador y del servidor', () => {
    expect(readFileSync(new URL('../../../frontend/app/components/ia/privacidad.ts', import.meta.url), 'utf8'))
      .toBe(readFileSync(new URL('./privacidad.ts', import.meta.url), 'utf8'))
  })
  it('el navegador también rechaza propuestas privadas y navegación de otro rol', () => {
    const captura = { controles: [{ id: 'p', nombre: 'Modificar usuario', tipo: 'boton' }, { id: 'g', nombre: 'Guardar conceptos', tipo: 'boton' }] }
    expect(validarPropuesta({ tipo: 'pulsar', control: 'p' }, captura, '/admin/clientes')).toBeNull()
    expect(validarPropuesta({ tipo: 'pulsar', control: 'g' }, captura, '/admin/obligaciones')).toEqual({ tipo: 'pulsar', control: 'g' })
    expect(validarPropuesta({ tipo: 'navegar', destino: '/admin/pagos' }, captura, '/cliente')).toBeNull()
  })
  it('sigue resumiendo clientes sin necesitar sus botones de edición privados', async () => {
    const result = await new IaService().consultar({ consulta: 'estado general de los clientes', contexto: '/admin/clientes', controles: [{ id: 'estrella', nombre: 'Destacar a Camila — Camila 17842693-1 No enviado Activo', tipo: 'boton' }] }, true)
    expect(result.respuesta).toContain('Activos: 1')
  })
})
