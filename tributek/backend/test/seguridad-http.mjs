import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'
import request from 'supertest'
import { createHash } from 'node:crypto'

process.env.JWT_SECRET = 'clave-local-de-pruebas-no-es-una-credencial-real-123456789'
process.env.JWT_2FA_SECRET = 'clave-local-distinta-para-desafios-no-real-123456789'
process.env.TWO_FACTOR_ENCRYPTION_KEY = 'a'.repeat(64)
const [{ AppModule }, { PrismaService }, { ServiciosService }, { EmailVerificationService }, { PaymentEvidenceService }] = await Promise.all([
  import('../dist/app.module.js'), import('../dist/prisma/prisma.service.js'),
  import('../dist/servicios/servicios.service.js'), import('../dist/correo/email-verification.service.js'),
  import('../dist/payment-evidence/payment-evidence.service.js'),
])
const hash = await argon2.hash('ClaveLocalDePrueba123')
const users = new Map([
  [1n, { id: 1n, nombreUsuario: 'principal_qa', rolId: 1n, activo: true, passwordHash: hash }],
  [2n, { id: 2n, nombreUsuario: 'cliente_qa', rolId: 2n, activo: true, passwordHash: hash }],
  [3n, { id: 3n, nombreUsuario: 'inactiva_qa', rolId: 1n, activo: false, passwordHash: hash }],
  [4n, { id: 4n, nombreUsuario: 'admin_qa', rolId: 1n, activo: true, passwordHash: hash }],
])
const matches = (u, cond) => Object.entries(cond).every(([key, value]) => u[key] === value)
const userTable = { where: cond => ({
  first: async () => { const u = [...users.values()].find(u => matches(u, cond))
    return u ? { ...u } : null },
  update: async data => { const u = [...users.values()].find(u => matches(u, cond))
    if (!u) return null
    Object.assign(u, data)
    return { ...u } },
  all: async () => [...users.values()].filter(u => matches(u, cond)),
}) }
const audit = []
const orm = { public: {
  Usuario: userTable,
  Rol: { where: cond => ({ first: async () => ({ id: cond.id, nombre: cond.id === 1n ? 'ADMIN' : 'CLIENTE' }) }) },
  UsuarioCliente: { where: cond => ({ all: async () => cond.usuarioId === 2n ? [{ usuarioId: 2n, clienteId: 20n }] : [], first: async () => cond.usuarioId === 2n && cond.clienteId === 20n ? { usuarioId: 2n, clienteId: 20n } : null }) },
  Cliente: { where: cond => ({ first: async () => ({ id: cond.id }) }) },
  Auditoria: { create: async event => { audit.push(event)
    return { id: BigInt(audit.length), ...event } } },
} }
const db = { orm, transaction: async fn => fn({ orm }) }
let serviceWrites = 0
let mails = 0
const serviceStub = {
  obtenerServicios: async () => [{ id: '1', nombre: 'Servicio de prueba' }],
  obtenerAsignaciones: async () => [{ id: '1', clienteId: '20' }],
  crearServicio: async () => { serviceWrites += 1
    return { id: '90' } },
}
const mod = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaService).useValue({ db })
  .overrideProvider(ServiciosService).useValue(serviceStub)
  .overrideProvider(EmailVerificationService).useValue({ enviar: async () => { mails += 1
    throw new Error('No se envían correos en QA') } })
  .compile()
const app = mod.createNestApplication({ logger: false })
const { configureHttpSecurity } = await import('../dist/common/http-security.js')
configureHttpSecurity(app)
const files = await mkdtemp(resolve(tmpdir(), 'tributek-qa-seguridad-'))
app.get(PaymentEvidenceService).root = files
await app.init()
const api = request(app.getHttpServer())
const jwt = app.get(JwtService)
const token = (id, extra = {}) => { const u = users.get(BigInt(id))
  return jwt.sign({ sub: String(id), nombreUsuario: u.nombreUsuario, rolId: String(u.rolId), rolNombre: u.rolId === 1n ? 'ADMIN' : 'CLIENTE', purpose: 'access', credentialVersion: createHash('sha256').update(u.passwordHash).digest('hex'), ...extra }) }
const client = token(2)
const baseline = process.argv.includes('--baseline')
const cases = []
async function check(id, response, expected) {
  cases.push({ id, esperado: expected, obtenido: response.status, aprobado: response.status === expected })
}
try {
  await check('SEC01 cliente no consulta asignaciones globales', await api.get('/servicios/asignaciones').auth(client, { type: 'bearer' }), 403)
  await check('SEC02 cliente no crea servicios', await api.post('/servicios').auth(client, { type: 'bearer' }).send({ nombre: 'Prueba aislada' }), 403)
  await check('SEC03 login rechaza un identificador de tipo objeto', await api.post('/auth/login').send({ nombreUsuario: { operador: 'alterado' }, password: 'prueba' }), 400)
  let response
  for (let i = 0; i < 11; i++) response = await api.post('/auth/login').send({ nombreUsuario: 'cuenta_inexistente_qa', password: 'incorrecta' })
  await check('SEC04 frena intentos repetidos de contraseña', response, 429)
  if (!baseline) {
    await check('SEC05 cuenta desactivada no conserva acceso', await api.get('/auth/perfil').auth(token(3), { type: 'bearer' }), 401)
    const staleRole = token(4)
    users.get(4n).rolId = 2n
    await check('SEC06 cambio de rol invalida la sesión anterior', await api.get('/servicios').auth(staleRole, { type: 'bearer' }), 401)
    users.get(4n).rolId = 1n
    const stalePassword = token(4)
    users.get(4n).passwordHash = await argon2.hash('OtraClaveDePrueba123')
    await check('SEC07 cambio de contraseña invalida la sesión anterior', await api.get('/auth/perfil').auth(stalePassword, { type: 'bearer' }), 401)
    const temporary = jwt.sign({ sub: '1', purpose: '2fa-login', jti: 'prueba' })
    await check('SEC08 un desafío no es una sesión', await api.get('/auth/perfil').auth(temporary, { type: 'bearer' }), 401)
    await check('SEC09 token manipulado no permite acceso', await api.get('/servicios').auth(client.slice(0, -8) + 'alterado', { type: 'bearer' }), 401)
    await check('SEC10 no accede a pagos de otro cliente', await api.get('/payment-evidence/30').auth(client, { type: 'bearer' }), 403)
    await check('SEC11 cliente no consulta administradores', await api.get('/administradores').auth(client, { type: 'bearer' }), 403)
    await check('SEC12 otro administrador no administra cuentas', await api.get('/administradores').auth(token(4), { type: 'bearer' }), 403)
    await check('SEC13 cliente no consulta trazabilidad global', await api.get('/auditoria').auth(client, { type: 'bearer' }), 403)
    await check('SEC14 consulta sin sesión no permite acceso', await api.get('/servicios'), 401)
    await check('SEC15 administrador vigente conserva acceso', await api.get('/servicios').auth(token(1), { type: 'bearer' }), 200)
    await check('SEC16 credenciales con texto SQL no autentican', await api.post('/auth/login').send({ nombreUsuario: "' OR '1'='1", password: 'incorrecta' }), 401)
    await check('SEC17 contraseña sobredimensionada se rechaza', await api.post('/auth/login').send({ nombreUsuario: 'principal_qa', password: 'a'.repeat(10000) }), 400)
    const login = await api.post('/auth/login').send({ nombreUsuario: 'cliente_qa', password: 'ClaveLocalDePrueba123' })
    await check('SEC18 login sin métodos configurados conserva el flujo', login, 201)
    assert.equal(typeof login.body.access_token, 'string')
    await check('SEC19 cliente activo conserva una sesión válida', await api.get('/auth/perfil').auth(login.body.access_token, { type: 'bearer' }), 200)
    const resetToken = jwt.sign({ sub: '2', purpose: 'reset-client-password', credentialVersion: createHash('sha256').update(hash).digest('hex') })
    const resetBody = { token: resetToken, password: 'NuevaClaveLocal12345', confirmarPassword: 'NuevaClaveLocal12345' }
    await check('SEC20 restablecimiento válido permite cambiar la clave', await api.post('/auth/activar-cuenta').send(resetBody), 201)
    await check('SEC21 enlace de restablecimiento consumido no se reutiliza', await api.post('/auth/activar-cuenta').send({ ...resetBody, password: 'ClaveAlterada12345', confirmarPassword: 'ClaveAlterada12345' }), 401)
    const headers = await api.get('/servicios')
    assert.equal(headers.headers['x-content-type-options'], 'nosniff')
    assert.equal(headers.headers['x-frame-options'], 'DENY')
    assert.equal(headers.headers['referrer-policy'], 'no-referrer')
    assert.equal(headers.headers['cache-control'], 'no-store')
    cases.push({ id: 'SEC22 cabeceras y ausencia de caché en API', esperado: 'cabeceras defensivas', obtenido: 'cabeceras defensivas', aprobado: true })
    await check('SEC23 campos imprevistos no modifican la autenticación', await api.post('/auth/login').send({ nombreUsuario: 'principal_qa', password: 'ClaveLocalDePrueba123', rolId: '1' }), 400)
    users.get(4n).email = 'qa@example.invalid'
    const challenge = await api.post('/auth/login').send({ nombreUsuario: 'admin_qa', password: 'OtraClaveDePrueba123' })
    assert.equal(challenge.body.requires2FA, true)
    assert.equal(challenge.body.access_token, undefined)
    cases.push({ id: 'SEC24 login con segundo factor no entrega acceso anticipado', esperado: 'solo desafío', obtenido: 'solo desafío', aprobado: true })
    await check('SEC25 método de segundo factor inválido se rechaza', await api.post('/auth/2fa/verify').send({ challengeToken: challenge.body.challengeToken, code: '123456', method: 'inventado' }), 400)
    users.get(4n).passwordHash = await argon2.hash('CambioPosterior12345')
    await check('SEC26 cambiar contraseña invalida desafíos pendientes', await api.post('/auth/2fa/email/send').send({ challengeToken: challenge.body.challengeToken }), 401)
    assert.equal(serviceWrites, 0)
    assert.equal(mails, 0)
  }
  const report = { fecha: '2026-11-15', fase: baseline ? 'antes' : 'después', entorno: 'API Nest aislada con cuentas ficticias y base simulada', casos: cases, correosEnviados: mails, escriturasEnServicios: serviceWrites }
  await writeFile(resolve('.tmp', baseline ? 'qa-seguridad-antes.json' : 'qa-seguridad-despues.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  if (!baseline) assert.ok(cases.every(c => c.aprobado), 'Hay casos de seguridad pendientes')
} finally {
  await app.close()
  await rm(files, { recursive: true, force: true })
}
