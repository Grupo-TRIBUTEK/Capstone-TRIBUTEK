import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }))
vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) }))
import * as argon2 from 'argon2'
import { AdministradoresService } from './administradores.service.js'
import type { PrismaService } from '../prisma/prisma.service.js'
import type { AdminEmailVerificationService } from './admin-email-verification.service.js'
const input = { email: 'Nuevo@Example.test', password: 'clave-de-Constanza' }
function setup({ duplicate = false, client = false } = {}) {
  const actor = { id: 1n, rolId: 1n, activo: true, passwordHash: 'hash-principal' }
  const target = { id: 9n, rolId: client ? 2n : 1n, email: 'anterior@example.test' }
  const update = vi.fn(async data => ({ ...target, ...data }))
  const audit = vi.fn().mockResolvedValue({})
  const users = { where: (condition: unknown) => ({
    first: async () => typeof condition === 'function' ? duplicate ? { id: 8n } : null : (condition as { id: bigint }).id === 1n ? actor : target,
    update,
  }) }
  const role = { where: (condition: { id: bigint }) => ({ first: async () => ({ id: condition.id, nombre: condition.id === 1n ? 'ADMIN' : 'CLIENTE' }) }) }
  const orm = { public: { Usuario: users, Rol: role, Auditoria: { create: audit } } }
  const transaction = vi.fn(async callback => callback({ orm }))
  const mail = { enviar: vi.fn().mockResolvedValue({ mensaje: 'Enviado' }), consumir: vi.fn() }
  const service = new AdministradoresService({ db: { orm, transaction } } as unknown as PrismaService, mail as unknown as AdminEmailVerificationService)
  return { service, update, audit, transaction, mail }
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('ADMIN_MANAGER_USER_ID', '1'); vi.mocked(argon2.verify).mockResolvedValue(true) })
describe('Edición confirmada del correo administrativo', () => {
  it('solo permite a Constanza solicitar o confirmar cambios', async () => {
    const { service, mail, update } = setup()
    await expect(service.solicitarCambioCorreo('2', '9', input)).rejects.toThrow('Solo Constanza')
    await expect(service.actualizarCorreo('2', '9', { ...input, code: '123456' })).rejects.toThrow('Solo Constanza')
    expect(mail.enviar).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it.each(['sin-arroba.cl', 'nombre@dominio', 'nombre@@dominio.cl', 'nombre@dominio,cl'])('rechaza el correo inválido %s', async email => {
    const { service, mail } = setup()
    await expect(service.solicitarCambioCorreo('1', '9', { ...input, email })).rejects.toThrow('correo válido')
    expect(mail.enviar).not.toHaveBeenCalled()
  })
  it('verifica la contraseña de Constanza antes de enviar y limita intentos', async () => {
    vi.mocked(argon2.verify).mockResolvedValue(false)
    const { service, mail } = setup()
    for (let n = 0; n < 5; n++) await expect(service.solicitarCambioCorreo('1', '9', input)).rejects.toThrow('contraseña actual no es correcta')
    await expect(service.solicitarCambioCorreo('1', '9', input)).rejects.toThrow('Demasiados intentos')
    expect(argon2.verify).toHaveBeenCalledTimes(5)
    expect(mail.enviar).not.toHaveBeenCalled()
  })
  it('envía el código sin cambiar ni auditar todavía el correo', async () => {
    const { service, mail, update, audit } = setup()
    await service.solicitarCambioCorreo('1', '9', input)
    expect(argon2.verify).toHaveBeenCalledWith('hash-principal', input.password)
    expect(mail.enviar).toHaveBeenCalledWith('1:9', 'nuevo@example.test')
    expect(update).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })
  it('rechaza duplicados y cuentas de cliente antes de enviar', async () => {
    await expect(setup({ duplicate: true }).service.solicitarCambioCorreo('1', '9', input)).rejects.toThrow('otra cuenta')
    await expect(setup({ client: true }).service.solicitarCambioCorreo('1', '9', input)).rejects.toThrow('no es administrativa')
  })
  it('no guarda nada si el código no es válido', async () => {
    const { service, mail, update } = setup()
    mail.consumir.mockImplementation(() => { throw new Error('Código incorrecto') })
    await expect(service.actualizarCorreo('1', '9', { ...input, code: '123456' })).rejects.toThrow('Código incorrecto')
    expect(update).not.toHaveBeenCalled()
  })
  it('actualiza y audita solo después de verificar código y contraseña', async () => {
    const { service, mail, update, audit } = setup()
    const result = await service.actualizarCorreo('1', '9', { ...input, code: '123456' })
    expect(mail.consumir).toHaveBeenCalledWith('1:9', 'nuevo@example.test', '123456')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ email: 'nuevo@example.test' }))
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 1n, entidadId: 9n, entidad: 'Administrador', accion: 'ACTUALIZAR' }))
    const detail = audit.mock.calls[0][0].detalle
    expect(detail).not.toContain(input.password)
    expect(detail).not.toContain('nuevo@example.test')
    expect(detail).not.toContain('123456')
    expect(result.actualizado).toBe(true)
  })
  it('permite verificar el correo actual sin exigir cambiar de dirección', async () => {
    const { service, mail, update } = setup()
    const current = { ...input, email: 'anterior@example.test' }
    await service.solicitarCambioCorreo('1', '9', current)
    expect(mail.enviar).toHaveBeenCalledWith('1:9', 'anterior@example.test')
    await service.actualizarCorreo('1', '9', { ...current, code: '123456' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ email: 'anterior@example.test', emailVerificadoEn: expect.anything() }))
  })

})
