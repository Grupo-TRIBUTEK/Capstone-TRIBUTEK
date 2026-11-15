import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mail = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => mail } }))
import { AdminEmailVerificationService } from './admin-email-verification.service.js'
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.stubEnv('SMTP_HOST', 'smtp.example.test')
  vi.stubEnv('SMTP_USER', 'remitente@example.test')
  vi.stubEnv('SMTP_PASS', 'credencial-solo-pruebas')
  vi.stubEnv('SMTP_PORT', '465')
  mail.sendMail.mockResolvedValue({ accepted: ['nuevo@example.test'], rejected: [] })
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
function code() { return String(mail.sendMail.mock.calls.at(-1)![0].text).match(/\b\d{6}\b/)![0] }
describe('Códigos de confirmación del nuevo correo', () => {
  it('no simula un envío cuando falta la credencial SMTP', async () => {
    vi.stubEnv('SMTP_PASS', '')
    await expect(new AdminEmailVerificationService().enviar('1:9', 'nuevo@example.test')).rejects.toThrow('no está configurado')
    expect(mail.sendMail).not.toHaveBeenCalled()
  })
  it('envía al nuevo correo y no devuelve el código al navegador', async () => {
    const service = new AdminEmailVerificationService()
    const response = await service.enviar('1:9', 'nuevo@example.test')
    expect(mail.sendMail.mock.calls[0][0].to).toBe('nuevo@example.test')
    expect(JSON.stringify(response)).not.toContain(code())
    expect(() => service.consumir('1:9', 'nuevo@example.test', code())).not.toThrow()
    expect(() => service.consumir('1:9', 'nuevo@example.test', code())).toThrow()
  })
  it('no permite usar el código en otro correo ni otra cuenta', async () => {
    const service = new AdminEmailVerificationService()
    await service.enviar('1:9', 'nuevo@example.test')
    expect(() => service.consumir('1:9', 'otro@example.test', code())).toThrow()
    expect(() => service.consumir('1:10', 'nuevo@example.test', code())).toThrow()
  })
  it('vence a los cinco minutos', async () => {
    const service = new AdminEmailVerificationService()
    await service.enviar('1:9', 'nuevo@example.test')
    vi.advanceTimersByTime(300001)
    expect(() => service.consumir('1:9', 'nuevo@example.test', code())).toThrow('venció')
  })
  it('limita los reenvíos y la cantidad de intentos', async () => {
    const service = new AdminEmailVerificationService()
    await service.enviar('1:9', 'nuevo@example.test')
    await expect(service.enviar('1:9', 'corregido@example.test')).rejects.toThrow('un minuto')
    for (let n = 0; n < 5; n++) expect(() => service.consumir('1:9', 'nuevo@example.test', 'incorrecto')).toThrow()
    expect(() => service.consumir('1:9', 'nuevo@example.test', code())).toThrow()
  })
  it('un reenvío al correo corregido invalida la solicitud anterior', async () => {
    const service = new AdminEmailVerificationService()
    await service.enviar('1:9', 'equivocado@example.test')
    const previous = code()
    vi.advanceTimersByTime(61000)
    await service.enviar('1:9', 'corregido@example.test')
    expect(() => service.consumir('1:9', 'equivocado@example.test', previous)).toThrow()
    expect(() => service.consumir('1:9', 'corregido@example.test', code())).not.toThrow()
  })
  it('un fallo de envío no deja un código utilizable', async () => {
    mail.sendMail.mockRejectedValue(new Error('Fallo SMTP'))
    const service = new AdminEmailVerificationService()
    await expect(service.enviar('1:9', 'nuevo@example.test')).rejects.toThrow('correo anterior se conserva')
    expect(() => service.consumir('1:9', 'nuevo@example.test', code())).toThrow()
  })
})
