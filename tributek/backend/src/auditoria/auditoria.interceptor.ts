import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { concatMap } from 'rxjs';
import { AuditoriaService } from './auditoria.service.js';

type AuditRequest = { method: string; path: string; params: Record<string, string>; user?: { id: string } };
const entidades: Record<string, string> = { clientes: 'Cliente', servicios: 'Servicio', documentos: 'Documento', gestiones: 'Gestion', periodos: 'Obligacion', obligaciones: 'Obligacion', facturas: 'Factura', f29: 'ProyeccionF29', 'payment-evidence': 'Transaccion' };

/** Registra solo operaciones terminadas y el actor autenticado. Nunca copia cuerpos, credenciales o archivos. */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const login = ['/auth/login', '/auth/2fa/verify'].includes(request.path) && request.method === 'POST';
    const seguridad: Record<string, string> = { '/auth/2fa/email/confirm': 'VERIFICAR_CORREO', '/auth/2fa/relink': 'REVINCULAR_2FA', '/auth/2fa/relink/confirm': 'COMPROBAR_2FA', '/auth/2fa/setup': 'CONFIGURAR_2FA', '/auth/2fa/confirm': 'ACTIVAR_2FA', '/auth/2fa/disable': 'DESACTIVAR_2FA' };
    const securityAction = request.method === 'POST' ? seguridad[request.path] : undefined;
    const entidad = login || securityAction ? 'Usuario' : entidades[request.path.split('/')[1] ?? ''];
    if (!entidad || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next.handle();
    return next.handle().pipe(concatMap(async (result: unknown) => {
      const data = result as { id?: unknown; usuario?: { id?: unknown } } | null;
      const actor = login ? data?.usuario?.id : request.user?.id;
      if (typeof actor !== 'string' || !/^\d+$/.test(actor)) return result;
      const candidato = login || securityAction ? actor : data?.id ?? request.params.id ?? request.params.abonoId ?? request.params.postergacionId ?? request.params.clienteId ?? request.params.client;
      const entidadId = typeof candidato === 'bigint' || typeof candidato === 'number' || typeof candidato === 'string' && /^\d+$/.test(candidato) ? String(candidato) : null;
      const accion = login ? 'INICIAR_SESION' : securityAction ?? (request.method === 'DELETE' ? 'ELIMINAR' : ['PUT', 'PATCH'].includes(request.method) ? 'ACTUALIZAR' : 'CREAR');
      try {
        await this.auditoria.registrar({ usuarioId: actor, entidad, entidadId, accion, detalle: login ? 'Inicio de sesión correcto.' : `${request.method} ${request.path.split('?')[0]} completado correctamente.` });
      } catch (error) {
        // La operación ya se completó: no devolver un fallo que invite a duplicar pagos o registros.
        this.logger.error(`No se pudo registrar ${accion} en ${entidad}. La operación de negocio sí terminó.`, error instanceof Error ? error.stack : undefined);
      }
      return result;
    }));
  }
}
