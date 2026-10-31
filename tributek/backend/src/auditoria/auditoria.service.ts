/**
 * Lógica de consulta del historial de acciones. Aquí se coordinan validaciones y operaciones del módulo.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import 'temporal-polyfill/global';
import { parseFechaIsoOpcional } from '../common/parse.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditoriaQueryDto } from './dto/auditoria-query.dto.js';

type AuditEntry = {
  id: string;
  creadoEn: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string | null;
  usuario: { nombreUsuario: string } | null;
};

type AuditPage = { items: AuditEntry[]; total: number };

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aplica filtros al historial y devuelve una página y su total; limita la consulta a 100 eventos por página. */
  async listar(query: AuditoriaQueryDto): Promise<AuditPage> {
    const pagina = Math.max(1, query.pagina ?? 1);
    const limite = Math.min(100, Math.max(1, query.limite ?? 20));
    const skip = (pagina - 1) * limite;

    const where: Record<string, unknown> = {};

    if (query.entidad) {
      where.entidad = query.entidad;
    }

    if (query.accion) {
      where.accion = query.accion;
    }

    if (query.desde || query.hasta) {
      const creadoEn: Record<string, Date> = {};
      if (query.desde) {
        const desde = parseFechaIsoOpcional(query.desde, 'desde');
        if (desde) {
          creadoEn.gte = new Date(desde.toString());
        }
      }
      if (query.hasta) {
        const hasta = parseFechaIsoOpcional(query.hasta, 'hasta');
        if (hasta) {
          const endOfDay = hasta.add({ days: 1 });
          creadoEn.lt = new Date(endOfDay.toString());
        }
      }
      if (Object.keys(creadoEn).length > 0) {
        where.creadoEn = creadoEn;
      }
    }

    if (query.buscar) {
      const search = query.buscar.trim();
      if (search) {
        where.OR = [
          { detalle: { contains: search, mode: 'insensitive' } },
          { entidadId: { equals: search } },
          { usuario: { nombreUsuario: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }
    const [items, todosLosRegistros] = await Promise.all([
      this.prisma.db.orm.public.Auditoria.where(where)
        .include('usuario')
        .orderBy((a) => a.creadoEn.desc())
        .offset(skip)
        .limit(limite)
        .all(),

      this.prisma.db.orm.public.Auditoria.where(where).all(),
    ]);

    const total = todosLosRegistros.length;

    return {
      items: items.map((a) => ({
        id: String(a.id),
        creadoEn: a.creadoEn?.toString() ?? null,
        accion: a.accion,
        entidad: a.entidad,
        entidadId: a.entidadId ? String(a.entidadId) : null,
        detalle: a.detalle ?? null,
        usuario: a.usuario ? { nombreUsuario: String(a.usuario.nombreUsuario) } : null,
      })),
      total,
    };
  }
}
