/**
 * Lógica de consulta del historial de acciones. Aquí se coordinan validaciones y operaciones del módulo.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import 'temporal-polyfill/global';
import { parseFechaIsoOpcional } from '../common/parse.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { or } from '@prisma/orm-postgres/orm-client';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
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

  async registrar(evento: { usuarioId: string; accion: string; entidad: string; entidadId: string | null; detalle: string }) {
    return this.prisma.db.orm.public.Auditoria.create({
      usuarioId: BigInt(evento.usuarioId), accion: evento.accion as Varchar<80>, entidad: evento.entidad as Varchar<80>,
      entidadId: evento.entidadId ? BigInt(evento.entidadId) : null, detalle: evento.detalle as Varchar<1000>, creadoEn: Temporal.Now.instant(),
    });
  }

  /** Aplica filtros al historial y devuelve una página y su total; limita la consulta a 100 eventos por página. */
  async listar(query: AuditoriaQueryDto): Promise<AuditPage> {
    const pagina = Math.max(1, query.pagina ?? 1);
    const limite = Math.min(100, Math.max(1, query.limite ?? 20));
    const skip = (pagina - 1) * limite;

    if (query.desde && query.hasta && query.desde > query.hasta) throw new BadRequestException('La fecha desde no puede ser posterior a hasta.');
    let consulta = this.prisma.db.orm.public.Auditoria;
    if (query.entidad) consulta = consulta.where({ entidad: query.entidad as Varchar<80> });
    if (query.accion) consulta = consulta.where({ accion: query.accion as Varchar<80> });
    const desde = parseFechaIsoOpcional(query.desde, 'desde');
    const hasta = parseFechaIsoOpcional(query.hasta, 'hasta');
    if (desde) consulta = consulta.where(a => a.creadoEn.gte(desde.toZonedDateTime('America/Santiago').toInstant()));
    if (hasta) consulta = consulta.where(a => a.creadoEn.lt(hasta.add({ days: 1 }).toZonedDateTime('America/Santiago').toInstant()));
    const buscar = query.buscar?.trim();
    if (buscar) {
      const patron = `%${buscar.replace(/[\\%_]/g, '\\$&')}%`;
      const usuarios = await this.prisma.db.orm.public.Usuario.select('id').where(u => u.nombreUsuario.ilike(patron)).all();
      consulta = consulta.where(a => or(
        a.detalle.ilike(patron),
        a.usuarioId.in(usuarios.map(u => u.id)),
        ...(/^\d+$/.test(buscar) ? [a.entidadId.eq(BigInt(buscar))] : []),
      ));
    }
    const [items, conteo] = await Promise.all([
      consulta.include('usuario').orderBy([a => a.creadoEn.desc(), a => a.id.desc()]).offset(skip).limit(limite).all(),
      consulta.aggregate(a => ({ total: a.count() })),
    ]);
    const total = Number(conteo.total);

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
