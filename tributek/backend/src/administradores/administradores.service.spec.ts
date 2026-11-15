import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }))
vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH_SEGURO'), argon2id: 2 }))
import * as argon2 from 'argon2'
import { AdministradoresService } from './administradores.service.js'
import type { PrismaService } from '../prisma/prisma.service.js'

const input = { nombre: 'Equipo Contable', nombreUsuario: 'equipo.contable', email: 'equipo@example.test', password: 'UnaClaveLarga2026!', confirmarPassword: 'UnaClaveLarga2026!' }
function setup({ activo = true, roleName = 'ADMIN', duplicate = '', auditFails = false } = {}) {
  const actor = { id: 1n, rolId: 7n, activo }
  const role = { id: 7n, nombre: roleName }
  const create = vi.fn().mockResolvedValue({ id: 9n, nombre: input.nombre, nombreUsuario: input.nombreUsuario, email: input.email, activo: true, passwordHash: 'HASH_SEGURO' })
  const audit = vi.fn().mockImplementation(async () => { if (auditFails) throw new Error('Auditoría no disponible'); return {} })
  const userQueries = [duplicate === 'user' ? { id: 2n } : null, duplicate === 'email' ? { id: 3n } : null]
  const tx = { orm: { public: { Usuario: { where: vi.fn(() => ({ first: async () => userQueries.shift() ?? null })), create }, Auditoria: { create: audit } } } }
  const orm = { public: { Usuario: { where: vi.fn(() => ({ first: async () => actor })) }, Rol: { where: vi.fn(() => ({ first: async () => role })), all: async () => [role] } } }
  const transaction = vi.fn(async callback => callback(tx))
  const service = new AdministradoresService({ db: { orm, transaction } } as unknown as PrismaService)
  return { service, create, audit, transaction, orm }
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('ADMIN_MANAGER_USER_ID', '1') })
describe('Gestión exclusiva de administradores', () => {
  it('permite solo el ID configurado y valida el rol en la base', async () => {
    expect(await setup().service.puedeAdministrar('1')).toBe(true)
    expect(await setup().service.puedeAdministrar('2')).toBe(false)
    expect(await setup({ roleName: 'CLIENTE' }).service.puedeAdministrar('1')).toBe(false)
  })
  it('deniega cuentas inactivas', async () => { expect(await setup({ activo: false }).service.puedeAdministrar('1')).toBe(false) })
  it('deniega el acceso sin configuración explícita', async () => {
    vi.stubEnv('ADMIN_MANAGER_USER_ID', '')
    const { service, create } = setup()
    await expect(service.crear('1', input)).rejects.toThrow('Solo Constanza')
    expect(create).not.toHaveBeenCalled()
  })
  it('rechaza solicitudes directas de otro administrador sin crear nada', async () => {
    const { service, transaction } = setup()
    await expect(service.crear('2', input)).rejects.toThrow('Solo Constanza')
    await expect(service.listar('2')).rejects.toThrow('Solo Constanza')
    expect(transaction).not.toHaveBeenCalled()
  })
  it('rechaza roles y permisos enviados por el navegador', async () => {
    const { service, create } = setup()
    await expect(service.crear('1', { ...input, rolId: '1' })).rejects.toThrow('No se permiten')
    expect(create).not.toHaveBeenCalled()
  })
  it('valida la contraseña y su confirmación en el servidor', async () => {
    const { service, create } = setup()
    await expect(service.crear('1', { ...input, password: 'corta' })).rejects.toThrow('12 y 128')
    await expect(service.crear('1', { ...input, confirmarPassword: 'otra' })).rejects.toThrow('no coinciden')
    expect(create).not.toHaveBeenCalled()
  })
  it.each(['user', 'email'])('rechaza duplicados de %s', async duplicate => {
    const { service, create } = setup({ duplicate })
    await expect(service.crear('1', input)).rejects.toThrow('registrado')
    expect(create).not.toHaveBeenCalled()
  })
  it('guarda hash Argon2id, asigna rol de servidor y registra el actor sin datos privados', async () => {
    const { service, create, audit } = setup()
    const result = await service.crear('1', input)
    expect(argon2.hash).toHaveBeenCalledWith(input.password, { type: argon2.argon2id })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'HASH_SEGURO', rolId: 7n }))
    expect(result).not.toHaveProperty('passwordHash')
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 1n, entidad: 'Administrador', entidadId: 9n }))
    const detail = audit.mock.calls[0][0].detalle
    expect(detail).not.toContain(input.email)
    expect(detail).not.toContain(input.password)
    expect(process.env.ADMIN_MANAGER_USER_ID).toBe('1')
  })
  it('no confirma una creación cuando falla el registro dentro de la transacción', async () => {
    await expect(setup({ auditFails: true }).service.crear('1', input)).rejects.toThrow('Auditoría no disponible')
  })
  it('interpreta una colisión de unicidad concurrente como conflicto', async () => {
    const { service, create } = setup()
    create.mockRejectedValue({ cause: { code: '23505' } })
    await expect(service.crear('1', input)).rejects.toThrow('ya está registrado')
  })
})
