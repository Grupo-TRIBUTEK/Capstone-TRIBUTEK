import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number, expires: number }>()
  private readonly windowMs = 15 * 60 * 1000

  canActivate(context: ExecutionContext) {
    const http = context.switchToHttp()
    const req = http.getRequest<{ ip?: string, socket?: { remoteAddress?: string }, body?: { nombreUsuario?: unknown } }>()
    const response = http.getResponse<{ setHeader: (name: string, value: string) => void }>()
    const now = Date.now()
    for (const [key, value] of this.attempts) if (value.expires <= now) this.attempts.delete(key)
    const ip = req.ip || req.socket?.remoteAddress || 'sin-direccion'
    const identifier = typeof req.body?.nombreUsuario === 'string' ? req.body.nombreUsuario.trim().toLowerCase().slice(0, 150) : ''
    const digest = (value: string) => createHash('sha256').update(value).digest('hex')
    const keys: [string, number][] = [[`ip:${digest(ip)}`, 60]]
    if (identifier) keys.push([`cuenta:${digest(identifier)}`, 10])
    for (const [key, max] of keys) {
      const attempt = this.attempts.get(key)
      if ((attempt && attempt.count >= max) || (!attempt && this.attempts.size >= 10000)) {
        response.setHeader('Retry-After', String(Math.max(1, Math.ceil(((attempt?.expires ?? now + this.windowMs) - now) / 1000))))
        throw new HttpException('Demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo.', HttpStatus.TOO_MANY_REQUESTS)
      }
    }
    for (const [key] of keys) {
      const attempt = this.attempts.get(key) ?? { count: 0, expires: now + this.windowMs }
      attempt.count += 1
      this.attempts.set(key, attempt)
    }
    return true
  }
}
