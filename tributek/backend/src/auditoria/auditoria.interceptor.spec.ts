import { describe, expect, it, vi } from 'vitest';
import { type ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import { type AuditoriaService } from './auditoria.service.js';

function setup(path: string, method = 'PUT', user: { id: string } | undefined = { id: '1' }) {
  const registrar = vi.fn().mockResolvedValue({ id: 1n });
  const interceptor = new AuditoriaInterceptor({ registrar } as unknown as AuditoriaService);
  const context = { switchToHttp: () => ({ getRequest: () => ({ path, method, params: { clienteId: '9' }, user, body: { password: 'no-registrar', email: 'privado@example.com' } }) }) } as unknown as ExecutionContext;
  return { registrar, interceptor, context };
}
describe('Registro de operaciones reales', () => {
  it('guarda el actor autenticado y espera el registro antes de devolver el resultado', async () => {
    const { registrar, interceptor, context } = setup('/obligaciones/mes/9');
    const resultado = { id: '18', monto: 100 };
    expect(await lastValueFrom(interceptor.intercept(context, { handle: () => of(resultado) }))).toBe(resultado);
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: '1', entidad: 'Obligacion', entidadId: '18', accion: 'ACTUALIZAR' }));
    const guardado = JSON.stringify(registrar.mock.calls);
    expect(guardado).not.toContain('no-registrar');
    expect(guardado).not.toContain('privado@example.com');
  });
  it('no convierte una operación rechazada en un evento exitoso', async () => {
    const { registrar, interceptor, context } = setup('/facturas/9');
    await expect(lastValueFrom(interceptor.intercept(context, { handle: () => throwError(() => new Error('Validación fallida')) }))).rejects.toThrow('Validación fallida');
    expect(registrar).not.toHaveBeenCalled();
  });
  it('no registra consultas ni mensajes del chatbot como cambios de datos', async () => {
    for (const [path, method] of [['/clientes', 'GET'], ['/auditoria', 'GET'], ['/ia/consultas', 'POST']]) {
      const { registrar, interceptor, context } = setup(path!, method!);
      await lastValueFrom(interceptor.intercept(context, { handle: () => of({}) }));
      expect(registrar).not.toHaveBeenCalled();
    }
  });
  it('identifica un login por la cuenta verificada y nunca guarda su token', async () => {
    const { registrar, interceptor, context } = setup('/auth/login', 'POST', undefined);
    await lastValueFrom(interceptor.intercept(context, { handle: () => of({ usuario: { id: '7' }, access_token: 'secreto' }) }));
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: '7', accion: 'INICIAR_SESION' }));
    expect(JSON.stringify(registrar.mock.calls)).not.toContain('secreto');
  });
  it('no invita a duplicar una operación si falla la bitácora después del guardado', async () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { registrar, interceptor, context } = setup('/obligaciones/mes/9');
    registrar.mockRejectedValue(new Error('Sin conexión'));
    const guardado = { id: '3' };
    expect(await lastValueFrom(interceptor.intercept(context, { handle: () => of(guardado) }))).toBe(guardado);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
})
