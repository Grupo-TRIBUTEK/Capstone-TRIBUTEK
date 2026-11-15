import { beforeEach, describe, expect, it } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-access-secret-for-strategy-1234567890';
  });

  async function load() {
    const mod = await import('./jwt.strategy.js');
    return new mod.JwtStrategy();
  }

  it('acepta token de acceso con purpose access y claims requeridos', async () => {
    const strategy = await load();
    const user = await strategy.validate({ sub: '1', nombreUsuario: 'ana', rolId: '2', rolNombre: 'ADMIN', purpose: 'access' } as any);
    expect(user).toEqual({ id: '1', nombreUsuario: 'ana', rolId: '2', rolNombre: 'ADMIN' });
  });

  it('rechaza token temporal de desafío 2FA como acceso', async () => {
    const strategy = await load();
    await expect(strategy.validate({ sub: '1', purpose: '2fa-login', jti: 'x' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza cualquier token temporal/no-acceso aunque tenga claims', async () => {
    const strategy = await load();
    await expect(strategy.validate({ sub: '1', nombreUsuario: 'ana', rolId: '2', purpose: 'set-client-password' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza token sin claims de acceso requeridos', async () => {
    const strategy = await load();
    await expect(strategy.validate({ sub: '1', purpose: 'access' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
