import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
vi.mock('../prisma/db.js', () => ({ db: {} }))
import { JwtStrategy } from './jwt.strategy.js'
import { credentialVersion } from './credential-version.js'
import type { PrismaService } from '../prisma/prisma.service.js'

beforeEach(() => { process.env.JWT_SECRET = 'test-access-secret-for-strategy-1234567890' })
const payload = { sub: '1', nombreUsuario: 'ana', rolId: '2', rolNombre: 'ADMIN', purpose: 'access', credentialVersion: credentialVersion('hash-de-prueba') }
function setup(overrides = {}) {
  const usuario = { id: 1n, activo: true, nombreUsuario: 'ana', rolId: 2n, passwordHash: 'hash-de-prueba', ...overrides }
  const prisma = { db: { orm: { public: {
    Usuario: { where: () => ({ first: async () => usuario }) },
    Rol: { where: () => ({ first: async () => ({ nombre: 'CLIENTE' }) }) },
  } } } } as unknown as PrismaService
  return new JwtStrategy(prisma)
}
describe('JwtStrategy', () => {
  it('usa el rol vigente de la base y no confía en un nombre de rol del token', async () => {
    expect(await setup().validate(payload)).toEqual({ id: '1', nombreUsuario: 'ana', rolId: '2', rolNombre: 'CLIENTE' })
  })
  it('rechaza un desafío 2FA aunque esté firmado', async () => {
    await expect(setup().validate({ ...payload, purpose: '2fa-login' })).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('rechaza otros propósitos temporales', async () => {
    await expect(setup().validate({ ...payload, purpose: 'set-client-password' })).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('rechaza sesiones antiguas sin vínculo a la contraseña', async () => {
    await expect(setup().validate({ ...payload, credentialVersion: undefined })).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('rechaza una cuenta desactivada después de iniciar sesión', async () => {
    await expect(setup({ activo: false }).validate(payload)).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('rechaza una sesión después de cambiar su contraseña o rol', async () => {
    await expect(setup({ passwordHash: 'otro-hash' }).validate(payload)).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(setup({ rolId: 1n }).validate(payload)).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('rechaza identificadores que no son IDs decimales', async () => {
    await expect(setup().validate({ ...payload, sub: "' OR 1=1" })).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
