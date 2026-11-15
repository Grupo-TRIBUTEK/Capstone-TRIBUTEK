import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { login, verifyLogin2fa } from '../../frontend/app/features/auth/auth-client'

let storage: Map<string, string>
beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } })
})
afterEach(() => vi.unstubAllGlobals())
describe('Sesión del navegador durante el 2FA', () => {
  it('elimina una sesión previa y no guarda el desafío como acceso', async () => {
    storage.set('tributek_access_token', 'sesion-anterior')
    storage.set('tributek_user', '{}')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ requires2FA: true, challengeToken: 'desafio' })))
    await login('ConstanzaS', 'clave-de-prueba')
    expect(storage.has('tributek_access_token')).toBe(false)
    expect(storage.has('tributek_user')).toBe(false)
  })
  it('guarda solo la sesión completa después del código correcto', async () => {
    const usuario = { id: '1', nombreUsuario: 'ConstanzaS', rolId: '1', rolNombre: 'ADMIN' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ access_token: 'sesion-final', usuario })))
    await verifyLogin2fa('desafio', '123456')
    expect(storage.get('tributek_access_token')).toBe('sesion-final')
    expect(JSON.parse(storage.get('tributek_user')!)).toEqual(usuario)
  })
  it('un código inválido no crea una sesión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Código inválido' }, { status: 401 })))
    await expect(verifyLogin2fa('desafio', 'incorrecto')).rejects.toThrow('Código inválido')
    expect(storage.size).toBe(0)
  })
})
