/**
 * Lógica de períodos contables por cliente, año y mes. Aquí se coordinan validaciones y operaciones del módulo.
 */
import { parseId, parseAnio, parseMes } from '../common/parse.js';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import 'temporal-polyfill/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardarPeriodoDto } from './dto/guardar-periodo.dto.js';

// Estado con el que se abre un período nuevo. La vista Obligaciones deriva
// NO ENVIADO/ENVIADO/PAGADO en el frontend; aquí solo marcamos que el período
// existe y está abierto. EVITAR: usar este valor como catálogo cerrado sin
// revisar `management/model.ts` (si el frontend exige otros, cambiar ambos).
const ESTADO_ABIERTO = 'Abierto' as Varchar<30>;

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class PeriodosService {
  constructor(private readonly prisma: PrismaService) {}

  // QUÉ HACE: listado de períodos con filtros opcionales (cliente/año/mes).
  // ALIMENTA: la vista Obligaciones (estado del mes) y futuras consultas del F29.
  async listar(filters: { clienteId?: string; anio?: string; mes?: string }) {
    let query = this.prisma.db.orm.public.PeriodoCliente;
    if (filters.clienteId) {
      query = query.where({ clienteId: parseId(filters.clienteId, 'clienteId') });
    }
    if (filters.anio) {
      query = query.where({ anio: parseAnio(filters.anio) });
    }
    if (filters.mes) {
      query = query.where({ mes: parseMes(filters.mes) });
    }
    return query
      .orderBy((p) => p.anio.asc())
      .orderBy((p) => p.mes.asc())
      .all();
  }

  // QUÉ HACE: upsert de un período — crea la fila si (cliente, año, mes) no
  //   existe; si existe, actualiza estado/vencimiento/cerrado sin tocar el id
  //   (otros módulos ya referencian `periodos_cliente.id` con FK).
  async guardar(data: GuardarPeriodoDto) {
    const clienteId = parseId(data.clienteId, 'clienteId');
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const estado = this.parseEstado(data.estadoContable);
    const fechaVencimiento = this.parseFecha(data.fechaVencimiento);
    const cerrado = data.cerrado ?? false;
    if (typeof cerrado !== 'boolean') {
      throw new BadRequestException('El campo "cerrado" debe ser booleano.');
    }

    const cliente = await this.prisma.db.orm.public.Cliente.where({
      id: clienteId,
    }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    await this.prisma.db.transaction(async (tx) => {
      const actual = await tx.orm.public.PeriodoCliente.where({
        clienteId,
        anio,
        mes,
      }).first();
      if (actual) {
        await tx.orm.public.PeriodoCliente.where({ id: actual.id }).update({
          estadoContable: estado,
          fechaVencimiento,
          cerrado,
        });
        return;
      }
      await tx.orm.public.PeriodoCliente.create({
        clienteId,
        anio,
        mes,
        estadoContable: estado,
        fechaVencimiento,
        cerrado,
        creadoEn: Temporal.Now.instant(),
      });
    });

    return this.prisma.db.orm.public.PeriodoCliente.where({
      clienteId,
      anio,
      mes,
    }).first();
  }

  // QUÉ HACE: garantiza que exista la fila (cliente, año, mes) y devuelve su id.
  // QUIÉN LO USA: F29Service — `proyecciones_f29.periodo_id` es FK NOT NULL,
  //   así que guardar una proyección exige crear el período antes si no existe.
  async asegurar(clienteId: bigint, anio: number, mes: number): Promise<bigint> {
    const existente = await this.prisma.db.orm.public.PeriodoCliente.where({
      clienteId,
      anio,
      mes,
    }).first();
    if (existente) return existente.id;
    const creado = await this.prisma.db.orm.public.PeriodoCliente.create({
      clienteId,
      anio,
      mes,
      estadoContable: ESTADO_ABIERTO,
      fechaVencimiento: null,
      cerrado: false,
      creadoEn: Temporal.Now.instant(),
    });
    return creado.id;
  }

  // Devuelve todos los IDs de períodos para una lista de clientes
  async obtenerIdsPorClientes(clienteIds: bigint[]): Promise<bigint[]> {
    if (!clienteIds.length) return [];
    const periodos = await this.prisma.db.orm.public.PeriodoCliente.where((p) =>
      p.clienteId.in(clienteIds),
    ).all();
    return periodos.map((p) => p.id);
  }

  // Devuelve el primer período encontrado para ese año y mes, o null.
  // No crea períodos ni devuelve todos los clientes; no usar para un listado mensual.
  async asegurarIds(anio: number, mes: number): Promise<bigint | null> {
    const existente = await this.prisma.db.orm.public.PeriodoCliente.where({
      anio,
      mes,
    }).first();
    if (existente) return existente.id;
    return null; // No creamos automáticamente para todos, solo devolvemos null
  }

  // Devuelve períodos por sus IDs
  async obtenerPorIds(periodoIds: bigint[]): Promise<Map<bigint, any>> {
    if (!periodoIds.length) return new Map();
    const periodos = await this.prisma.db.orm.public.PeriodoCliente.where((p) =>
      p.id.in(periodoIds),
    ).all();
    return new Map(periodos.map((p) => [p.id, p]));
  }

  /** Usa Abierto cuando no se indicó estado y limita el texto a 30 caracteres. */
  private parseEstado(raw: unknown): Varchar<30> {
    if (raw === undefined || raw === null || raw === '') return ESTADO_ABIERTO;
    if (typeof raw !== 'string' || raw.length > 30) {
      throw new BadRequestException('estadoContable inválido: máximo 30 caracteres.');
    }
    return raw as Varchar<30>;
  }

  /** Convierte el vencimiento opcional a una fecha sin hora; null indica que aún no hay vencimiento. */
  private parseFecha(raw: unknown): Temporal.PlainDate | null {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string' || !FECHA_REGEX.test(raw)) {
      throw new BadRequestException(
        'fechaVencimiento inválida: usa el formato YYYY-MM-DD o vacío.',
      );
    }
    try {
      return Temporal.PlainDate.from(raw);
    } catch {
      throw new BadRequestException(`fechaVencimiento inválida: "${raw}".`);
    }
  }
}
