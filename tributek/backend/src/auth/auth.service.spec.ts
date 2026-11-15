const loginMail = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => loginMail } }))
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { generateSecret, generateSync } from 'otplib';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { EmailVerificationService } from '../correo/email-verification.service.js'
import { AuthService } from './auth.service.js';
import { encryptSecret } from './two-factor-crypto.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Usuario = any;

function makePrisma(opts: { usuario: Usuario | null; rol?: any; usuarioClientes?: any[] }) {
  let usuario: Usuario | null = opts.usuario ? { ...opts.usuario } : null;
  const rol = opts.rol ?? { id: 1n, nombre: 'ADMIN' };
  const usuarioClientes = opts.usuarioClientes ?? [{ usuarioId: 1n, clienteId: 1n }];
  const updates: any[] = [];

  const matches = (obj: any, cond: any) => Object.entries(cond || {}).every(([k, v]) => obj && obj[k] === v);

  const usuarioWhere = (cond: any) => ({
    first: async () => (usuario && matches(usuario, cond) ? { ...usuario } : null),
    update: async (data: any) => {
      updates.push({ cond, data });
      if (usuario && matches(usuario, cond)) {
        usuario = { ...usuario, ...data };
        return { ...usuario };
      }
      return null;
    },
    all: async () => (usuario && matches(usuario, cond) ? [{ ...usuario }] : []),
  });

  const orm: any = {
    Usuario: { where: (cond: any) => usuarioWhere(cond) },
    Rol: { where: (_cond: any) => ({ first: async () => rol }) },
    UsuarioCliente: { where: (_cond: any) => ({ all: async () => usuarioClientes }) },
  };

  const db: any = {
    orm: { public: orm },
    transaction: async (fn: any) => {
      const txOrm = { ...orm, Usuario: { where: (cond: any) => usuarioWhere(cond) } };
      return fn({ orm: { public: txOrm } });
    },
  };

  return { prisma: { db } as unknown as PrismaService, getUsuario: () => usuario, updates };
}

async function baseUsuario(overrides: Partial<Usuario> = {}): Promise<Usuario> {
  return {
    id: 1n,
    rolId: 1n,
    nombre: 'Ana',
    email: 'ana@test.local',
    nombreUsuario: 'ana',
    passwordHash: await argon2.hash('Password12345'),
    activo: true,
    creadoEn: null,
    actualizadoEn: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null,
    twoFactorRecoveryHashes: null,
    twoFactorSetupExpiresAt: null,
    ...overrides,
  };
}

describe('AuthService 2FA', () => {
  let jwt: JwtService;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'access-secret-for-tests-1234567890';
    process.env['JWT_2FA_SECRET'] = 'challenge-secret-for-tests-1234567890';
    process.env['TWO_FACTOR_ENCRYPTION_KEY'] = 'encryption-key-for-tests-1234567890';
    jwt = new JwtService({ secret: process.env['JWT_SECRET'], signOptions: { expiresIn: '1h' } });
  });

  it('login sin app ni correo entrega access token', async () => {
    const usuario = await baseUsuario({ email: null });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const res: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    expect(res.requires2FA).toBeUndefined();
    expect(res.access_token).toBeTruthy();
    expect(res.usuario?.nombreUsuario).toBe('ana');
  });

  it('login con 2FA activo devuelve desafío sin access token', async () => {
    const secret = generateSecret();
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const res: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    expect(res.requires2FA).toBe(true);
    expect(res.challengeToken).toBeTruthy();
    expect(res.access_token).toBeUndefined();
  });

  it('verify2fa rechaza código TOTP incorrecto', async () => {
    const secret = generateSecret();
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const challenge: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    await expect(svc.verify2fa(challenge.challengeToken, '000000')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verify2fa rechaza desafío expirado', async () => {
    const secret = generateSecret();
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const challenge: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    const payload: any = jwt.decode(challenge.challengeToken);
    (svc as any).loginChallenges.set(payload.jti, { sub: '1', exp: Date.now() - 1000 });
    const code = generateSync({ secret });
    await expect(svc.verify2fa(challenge.challengeToken, code)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verify2fa rechaza reutilización de código TOTP (mismo paso)', async () => {
    const secret = generateSecret();
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const c1: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    const c2: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    const code = generateSync({ secret });
    const ok = await svc.verify2fa(c1.challengeToken, code);
    expect((ok as any).access_token).toBeTruthy();
    await expect(svc.verify2fa(c2.challengeToken, code)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rechaza acceso cuando 2FA está habilitado pero falta el secreto (fail-closed)', async () => {
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: null, email: null });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    await expect(svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verify2fa permite recuperación con código de un solo uso sin desactivar 2FA', async () => {
    const secret = generateSecret();
    const recoveryCode = 'abcd1234';
    const hash = await argon2.hash('abcd1234');
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret), twoFactorRecoveryHashes: JSON.stringify([hash]) });
    const { prisma, getUsuario } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const challenge: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    const res: any = await svc.verify2fa(challenge.challengeToken, recoveryCode);
    expect(res.access_token).toBeTruthy();
    expect(res.recoveryCodeUsed).toBe(true);
    expect(getUsuario()?.twoFactorEnabled).toBe(true);
    expect(JSON.parse(getUsuario()?.twoFactorRecoveryHashes || '[]')).toHaveLength(0);
  });

  it('rechaza reutilización de código de recuperación', async () => {
    const secret = generateSecret();
    const recoveryCode = 'abcd1234';
    const hash = await argon2.hash('abcd1234');
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret), twoFactorRecoveryHashes: JSON.stringify([hash]) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const c1: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    await svc.verify2fa(c1.challengeToken, recoveryCode);
    const c2: any = await svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any);
    await expect(svc.verify2fa(c2.challengeToken, recoveryCode)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('confirm2fa rechaza configuración pendiente expirada', async () => {
    const tempSecret = generateSecret();
    const usuario = await baseUsuario({ twoFactorTempSecret: encryptSecret(tempSecret), twoFactorSetupExpiresAt: new Date(Date.now() - 60_000) });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    const code = generateSync({ secret: tempSecret });
    await expect(svc.confirm2fa('1', code)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige JWT_2FA_SECRET y TWO_FACTOR_ENCRYPTION_KEY (sin fallback)', async () => {
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: 'x' });
    const { prisma } = makePrisma({ usuario });
    const svc = new AuthService(prisma, jwt);
    delete process.env['JWT_2FA_SECRET'];
    await expect(svc.login({ nombreUsuario: 'ana', password: 'Password12345' } as any)).rejects.toThrow(/JWT_2FA_SECRET/);
    process.env['JWT_2FA_SECRET'] = 'challenge-secret-for-tests-1234567890';
    delete process.env['TWO_FACTOR_ENCRYPTION_KEY'];
    const { prisma: p2 } = makePrisma({ usuario: await baseUsuario() });
    const svc2 = new AuthService(p2, jwt);
    await expect(svc2.setup2fa('1', 'Password12345')).rejects.toThrow(/TWO_FACTOR_ENCRYPTION_KEY/);
  });
  it('no permite reemplazar un segundo factor activo por setup o confirm', async () => {
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(generateSecret()) })
    const { prisma, updates } = makePrisma({ usuario })
    const svc = new AuthService(prisma, jwt)
    await expect(svc.setup2fa('1', 'Password12345')).rejects.toBeInstanceOf(BadRequestException)
    await expect(svc.confirm2fa('1', '123456')).rejects.toBeInstanceOf(BadRequestException)
    expect(updates).toHaveLength(0)
  })

  it('permite volver a mostrar el QR solo con contraseña y recuperación sin desactivar 2FA', async () => {
    const secret = generateSecret()
    const hash = await argon2.hash('abcd1234')
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret), twoFactorRecoveryHashes: JSON.stringify([hash]) })
    const { prisma, getUsuario } = makePrisma({ usuario })
    const svc = new AuthService(prisma, jwt)
    const response = await svc.relink2fa('1', 'Password12345', 'abcd1234')
    expect(response.qrCodeDataUrl).toMatch(/^data:image\/png/)
    expect(response.secret).toBe(secret)
    expect(getUsuario()?.twoFactorEnabled).toBe(true)
    expect(getUsuario()?.twoFactorSecret).toBe(usuario.twoFactorSecret)
    expect(JSON.parse(getUsuario()?.twoFactorRecoveryHashes || '[]')).toHaveLength(0)
    await expect(svc.relink2fa('1', 'Password12345', 'abcd1234')).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('no revela el QR con contraseña o código incorrectos', async () => {
    const secret = generateSecret()
    const hash = await argon2.hash('abcd1234')
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret), twoFactorRecoveryHashes: JSON.stringify([hash]) })
    const { prisma, updates } = makePrisma({ usuario })
    const svc = new AuthService(prisma, jwt)
    await expect(svc.relink2fa('1', 'equivocada', 'abcd1234')).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(svc.relink2fa('1', 'Password12345', 'ffffffff')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(updates).toHaveLength(0)
  })
  it('comprueba el código generado por la app revinculada', async () => {
    const secret = generateSecret()
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret) })
    const { prisma } = makePrisma({ usuario })
    const svc = new AuthService(prisma, jwt)
    await expect(svc.confirmRelink2fa('1', 'no-valido')).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(svc.confirmRelink2fa('1', generateSync({ secret }))).resolves.toHaveProperty('mensaje')
  })

});


describe('Ingreso por app o correo verificado', () => {
  let jwt: JwtService
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'access-test-secret'
    process.env.JWT_2FA_SECRET = 'challenge-test-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'encryption-test-secret'
    process.env.SMTP_HOST = 'smtp.example.test'
    process.env.SMTP_PORT = '465'
    process.env.SMTP_USER = 'remitente@example.test'
    process.env.SMTP_PASS = 'credencial-de-prueba'
    loginMail.sendMail.mockResolvedValue({ accepted: ['ana@test.local'], rejected: [] })
    jwt = new JwtService({ secret: process.env.JWT_SECRET })
  })
  async function setup(overrides: Partial<Usuario> = {}) {
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: encryptSecret(generateSecret()), emailVerificadoEn: new Date(), ...overrides })
    const state = makePrisma({ usuario })
    const mail = new EmailVerificationService()
    const service = new AuthService(state.prisma, jwt, mail)
    return { ...state, service }
  }
  function emailCode() { return String(loginMail.sendMail.mock.calls.at(-1)![0].text).match(/\b\d{6}\b/)![0] }
  it('ofrece ambos métodos sin emitir sesión antes del segundo paso', async () => {
    const { service } = await setup()
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.methods).toEqual(['app', 'email'])
    expect(challenge.access_token).toBeUndefined()
    expect(challenge.maskedEmail).toBe('a***@test.local')
    expect(loginMail.sendMail).not.toHaveBeenCalled()
  })
  it('un correo verificado permite 2FA sin obligar a configurar una app', async () => {
    const { service } = await setup({ twoFactorEnabled: false, twoFactorSecret: null })
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.requires2FA).toBe(true)
    expect(challenge.methods).toEqual(['email'])
    expect(challenge.access_token).toBeUndefined()
  })
  it('ofrece el correo registrado y lo confirma al completar el primer ingreso por correo', async () => {
    const { service, getUsuario } = await setup({ emailVerificadoEn: null })
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.methods).toEqual(['app', 'email'])
    await service.enviarCodigoIngreso(challenge.challengeToken)
    expect(getUsuario()!.emailVerificadoEn).toBeNull()
    await service.verify2fa(challenge.challengeToken, emailCode(), 'email')
    expect(getUsuario()!.emailVerificadoEn).toBeTruthy()
  })
  it.each([null, '', 'sin-arroba.cl', 'nombre@dominio'])('no ofrece correo si la dirección no es válida: %s', async email => {
    const { service } = await setup({ email })
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.methods).toEqual(['app'])
    await expect(service.enviarCodigoIngreso(challenge.challengeToken)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(loginMail.sendMail).not.toHaveBeenCalled()
  })
  it('no envía correo con un desafío inventado', async () => {
    const { service } = await setup()
    await expect(service.enviarCodigoIngreso('inventado')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(loginMail.sendMail).not.toHaveBeenCalled()
  })
  it('envía al correo de la cuenta y emite la sesión solo con su código', async () => {
    const { service } = await setup()
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    await service.enviarCodigoIngreso(challenge.challengeToken)
    expect(loginMail.sendMail.mock.calls[0][0].to).toBe('ana@test.local')
    await expect(service.verify2fa(challenge.challengeToken, 'incorrecto', 'email')).rejects.toThrow()
    const result = await service.verify2fa(challenge.challengeToken, emailCode(), 'email')
    expect(result.access_token).toBeTruthy()
    expect(result.usuario.id).toBe('1')
    await expect(service.verify2fa(challenge.challengeToken, emailCode(), 'email')).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('un código de un intento no permite completar otro desafío', async () => {
    const { service } = await setup()
    const first: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    const second: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    await service.enviarCodigoIngreso(first.challengeToken)
    await expect(service.verify2fa(second.challengeToken, emailCode(), 'email')).rejects.toThrow()
    await expect(service.enviarCodigoIngreso(second.challengeToken)).rejects.toThrow('un minuto')
    await expect(service.verify2fa(first.challengeToken, emailCode(), 'email')).resolves.toHaveProperty('access_token')
  })
  it('no usa un código para un correo que cambió durante el ingreso', async () => {
    const { service, getUsuario } = await setup()
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    await service.enviarCodigoIngreso(challenge.challengeToken)
    getUsuario()!.email = 'cambiado@example.test'
    getUsuario()!.emailVerificadoEn = null
    await expect(service.verify2fa(challenge.challengeToken, emailCode(), 'email')).rejects.toBeInstanceOf(UnauthorizedException)
  })
  it('exige contraseña y código para habilitar el correo existente', async () => {
    const { service, getUsuario } = await setup({ emailVerificadoEn: null, twoFactorEnabled: false, twoFactorSecret: null })
    await expect(service.solicitarVerificacionMiCorreo('1', 'equivocada')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(loginMail.sendMail).not.toHaveBeenCalled()
    await service.solicitarVerificacionMiCorreo('1', 'Password12345')
    expect(getUsuario()!.emailVerificadoEn).toBeNull()
    await service.confirmarMiCorreo('1', emailCode())
    expect(getUsuario()!.emailVerificadoEn).toBeTruthy()
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.methods).toEqual(['email'])
  })
  it('no permite omitir el segundo paso si el envío SMTP no está disponible', async () => {
    const { service } = await setup({ twoFactorEnabled: false, twoFactorSecret: null })
    delete process.env.SMTP_PASS
    const challenge: any = await service.login({ nombreUsuario: 'ana', password: 'Password12345' })
    expect(challenge.methods).toEqual(['email'])
    expect(challenge.access_token).toBeUndefined()
    await expect(service.enviarCodigoIngreso(challenge.challengeToken)).rejects.toThrow('no está configurado')
  })
})
