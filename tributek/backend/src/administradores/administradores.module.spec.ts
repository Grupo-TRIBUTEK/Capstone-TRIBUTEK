import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../prisma/db.js', () => ({ db: {} }))
import { Test } from '@nestjs/testing'
import { AdministradoresModule } from './administradores.module.js'
import { AdministradoresService } from './administradores.service.js'
import { PrismaService } from '../prisma/prisma.service.js'

beforeEach(() => vi.stubEnv('JWT_SECRET', 'clave-exclusiva-para-prueba-de-modulo'))
afterEach(() => vi.unstubAllEnvs())
describe('Inicialización de AdministradoresModule', () => {
  it('resuelve JwtAuthGuard y sus opciones de Passport sin cambiar AuthModule', async () => {
    const module = await Test.createTestingModule({ imports: [AdministradoresModule] })
      .overrideProvider(PrismaService).useValue({ db: {} })
      .overrideProvider(AdministradoresService).useValue({})
      .compile()
    expect(module.get(AdministradoresService)).toBeDefined()
    await module.close()
  })
})
