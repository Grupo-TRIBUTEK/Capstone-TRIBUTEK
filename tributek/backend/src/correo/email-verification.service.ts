import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import nodemailer from 'nodemailer'

type Pending = { email: string, hash: Buffer, expiresAt: number, attempts: number, delivered: boolean }
@Injectable()
export class EmailVerificationService {
  private readonly pending = new Map<string, Pending>()
  private readonly cooldown = new Map<string, number>()
  private readonly limits = new Map<string, { count: number, until: number }>()
  private readonly pepper = randomBytes(32)
  private hash(key: string, email: string, code: string) {
    return createHmac('sha256', this.pepper).update(`${key}:${email}:${code}`).digest()
  }
  disponible() { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) }
  descartar(key: string) { this.pending.delete(key) }
  async enviar(key: string, email: string, purpose: 'email-change' | 'login' | 'email-enrollment' = 'email-change', rateKey = key) {
    const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env
    const port = Number(process.env.SMTP_PORT || 465)
    if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) throw new ServiceUnavailableException('El envío de correo no está configurado. Configura la credencial SMTP del remitente antes de solicitar un código.')
    const now = Date.now()
    if ((this.cooldown.get(rateKey) || 0) > now) throw new BadRequestException('Espera un minuto antes de solicitar otro código.')
    const actor = key.split(':')[0]
    let limit = this.limits.get(actor)
    if (!limit || limit.until <= now) { limit = { count: 0, until: now + 15 * 60 * 1000 }; this.limits.set(actor, limit) }
    if (limit.count >= 10) throw new BadRequestException('Se alcanzó el límite de envíos. Intenta nuevamente en 15 minutos.')
    limit.count++
    const code = String(randomInt(0, 1000000)).padStart(6, '0')
    const record: Pending = { email, hash: this.hash(key, email, code), expiresAt: now + 5 * 60 * 1000, attempts: 0, delivered: false }
    this.cooldown.set(rateKey, now + 60 * 1000)
    this.pending.set(key, record)
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass }, disableFileAccess: true, disableUrlAccess: true, connectionTimeout: 10000, socketTimeout: 15000 })
    try {
      const result = await transport.sendMail({ from: { name: 'TRIBUTEK', address: user }, to: email, subject: purpose === 'login' ? 'Tu código de ingreso a TRIBUTEK' : 'Confirma tu correo en TRIBUTEK', text: `Tu código para ${purpose === 'login' ? 'iniciar sesión en' : 'confirmar tu correo en'} TRIBUTEK es: ${code}\n\nVence en 5 minutos y solo se puede usar una vez. Ingresa el código únicamente en TRIBUTEK. Si no lo solicitaste, ignora este mensaje.` })
      if (result.rejected?.length || !result.accepted?.length) throw new Error('Destinatario rechazado')
      record.delivered = true
    } catch {
      this.pending.delete(key)
      throw new ServiceUnavailableException('No se pudo enviar el código. El correo anterior se conserva. Revisa el remitente o corrige la dirección e intenta nuevamente.')
    } finally { transport.close() }
    return { mensaje: purpose === 'login' ? 'Código enviado al correo de tu cuenta.' : 'Código enviado. Ingresa sus 6 dígitos para confirmar el correo.', expiresInSeconds: 300 }
  }
  consumir(key: string, email: string, code: string) {
    const record = this.pending.get(key)
    if (!record || !record.delivered || record.expiresAt <= Date.now() || record.attempts >= 5) { this.pending.delete(key); throw new BadRequestException('El código venció o no existe. Solicita uno nuevo.') }
    record.attempts++
    const correct = record.email === email && /^\d{6}$/.test(code) && timingSafeEqual(record.hash, this.hash(key, email, code))
    if (!correct) {
      if (record.attempts >= 5) this.pending.delete(key)
      throw new BadRequestException('El código no es correcto o corresponde a otro correo.')
    }
    this.pending.delete(key)
  }
}
