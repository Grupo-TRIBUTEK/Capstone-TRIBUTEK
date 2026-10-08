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
const ANIO_MIN = 2000;
const ANIO_MAX = 2099; // espejo de `validPeriod` en f29/model.ts (20xx)

@Injectable()
export class PeriodosService {
  constructor(private readonly prisma: PrismaService) {}

  // QUÉ HACE: listado de períodos con filtros opcionales (cliente/año/mes).
  // ALIMENTA: la vista Obligaciones (estado del mes) y futuras consultas del F29.
  async listar(filters: { clienteId?: string; anio?: string; mes?: string }) {
    let query = this.prisma.db.orm.public.PeriodoCliente;
    if (filters.clienteId) {
      query = query.where({ clienteId: this.parseId(filters.clienteId, 'clienteId') });
    }
    if (filters.anio) {
      query = query.where({ anio: this.parseAnio(filters.anio) });
    }
    if (filters.mes) {
      query = query.where({ mes: this.parseMes(filters.mes) });
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
    const clienteId = this.parseId(data.clienteId, 'clienteId');
    const anio = this.parseAnio(data.anio);
    const mes = this.parseMes(data.mes);
    const estado = this.parseEstado(data.estadoContable);
    const fechaVencimiento = this.parseFecha(data.fechaVencimiento);
    const cerrado = data.cerrado ?? false;
    if (typeof cerrado !== 'boolean') {
      throw new BadRequestException('El campo "cerrado" debe ser booleano.');
    }

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    await this.prisma.db.transaction(async (tx) => {
      const actual = await tx.orm.public.PeriodoCliente
        .where({ clienteId, anio, mes }).first();
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

    return this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
  }

  // QUÉ HACE: garantiza que exista la fila (cliente, año, mes) y devuelve su id.
  // QUIÉN LO USA: F29Service — `proyecciones_f29.periodo_id` es FK NOT NULL,
  //   así que guardar una proyección exige crear el período antes si no existe.
  async asegurar(clienteId: bigint, anio: number, mes: number): Promise<bigint> {
    const existente = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
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

  private parseId(raw: unknown, campo: string): bigint {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
      throw new BadRequestException(`${campo} inválido: debe ser un número.`);
    }
    return BigInt(raw);
  }

  private parseAnio(raw: unknown): number {
    const anio = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isInteger(anio) || (anio as number) < ANIO_MIN || (anio as number) > ANIO_MAX) {
      throw new BadRequestException(`Año inválido: debe estar entre ${ANIO_MIN} y ${ANIO_MAX}.`);
    }
    return anio as number;
  }

  private parseMes(raw: unknown): number {
    const mes = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isInteger(mes) || (mes as number) < 1 || (mes as number) > 12) {
      throw new BadRequestException('Mes inválido: debe ser 1..12.');
    }
    return mes as number;
  }

  private parseEstado(raw: unknown): Varchar<30> {
    if (raw === undefined || raw === null || raw === '') return ESTADO_ABIERTO;
    if (typeof raw !== 'string' || raw.length > 30) {
      throw new BadRequestException('estadoContable inválido: máximo 30 caracteres.');
    }
    return raw as Varchar<30>;
  }

  private parseFecha(raw: unknown): Temporal.PlainDate | null {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string' || !FECHA_REGEX.test(raw)) {
      throw new BadRequestException('fechaVencimiento inválida: usa el formato YYYY-MM-DD o vacío.');
    }
    try {
      return Temporal.PlainDate.from(raw);
    } catch {
      throw new BadRequestException(`fechaVencimiento inválida: "${raw}".`);
    }
  }
}