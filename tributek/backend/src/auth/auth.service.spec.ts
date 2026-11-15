import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { generateSecret, generateSync } from 'otplib';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

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

  it('login sin 2FA entrega access token', async () => {
    const usuario = await baseUsuario();
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
    const usuario = await baseUsuario({ twoFactorEnabled: true, twoFactorSecret: null });
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
});
