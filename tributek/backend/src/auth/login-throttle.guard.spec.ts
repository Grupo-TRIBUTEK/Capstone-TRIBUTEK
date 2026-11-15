import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionContext } from '@nestjs/common'
import { LoginThrottleGuard } from './login-throttle.guard.js'

function context(ip: string, nombreUsuario: unknown) {
  const setHeader = vi.fn()
  return { setHeader, value: { switchToHttp: () => ({
    getRequest: () => ({ ip, headers: { 'x-forwarded-for': 'direccion-no-confiable' }, body: { nombreUsuario } }),
    getResponse: () => ({ setHeader }),
  }) } as unknown as ExecutionContext }
}
afterEach(() => vi.useRealTimers())
describe('Límite de intentos de login', () => {
  it('limita un identificador aunque cambie su IP y use mayúsculas', () => {
    const guard = new LoginThrottleGuard()
    for (let i = 0; i < 10; i++) expect(guard.canActivate(context(String(i), 'Cuenta').value)).toBe(true)
    const blocked = context('otra-ip', '  CUENTA  ')
    expect(() => guard.canActivate(blocked.value)).toThrow('Demasiados intentos')
    expect(blocked.setHeader).toHaveBeenCalledWith('Retry-After', '900')
  })
  it('limita la IP aunque se prueben distintos usuarios', () => {
    const guard = new LoginThrottleGuard()
    for (let i = 0; i < 60; i++) guard.canActivate(context('ip-fija', `cuenta-${i}`).value)
    expect(() => guard.canActivate(context('ip-fija', 'otra-cuenta').value)).toThrow('Demasiados intentos')
  })
  it('permite volver a intentar cuando vence la ventana', () => {
    vi.useFakeTimers()
    const guard = new LoginThrottleGuard()
    const c = context('local', 'cuenta').value
    for (let i = 0; i < 10; i++) guard.canActivate(c)
    expect(() => guard.canActivate(c)).toThrow('Demasiados intentos')
    vi.advanceTimersByTime(15 * 60 * 1000)
    expect(guard.canActivate(c)).toBe(true)
  })
})
