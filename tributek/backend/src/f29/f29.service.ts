import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Numeric, Varchar } from '@prisma/orm-postgres/target/codec-types';
import 'temporal-polyfill/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { PeriodosService } from '../periodos/periodos.service.js';
import { GuardarProyeccionDto } from './dto/guardar-proyeccion.dto.js';

// El codec pg/numeric recibe texto decimal con la escala de la columna
// (input branded `Numeric<P, S>`, no `number`) — helpers para no repetir casts.
const num14 = (n: number): Numeric<14, 2> => n.toFixed(2) as Numeric<14, 2>;
const num63 = (n: number): Numeric<6, 3> => n.toFixed(3) as Numeric<6, 3>;

// Códigos de documento soportados (espejo de `f29/model.ts:120`).
// QUÉ HACE: única fuente de verdad del backend para validar el detalle RCV.
// EVITAR: agregar/quitar códigos aquí sin cambiar también `model.ts`.
const CODIGOS_SOPORTADOS = [33, 34, 39, 41, 46, 56, 61] as const;
// En compras 39 y 41 no se importan (espejo de `f29/model.ts:140`).
const CODIGOS_EXCLUIDOS_COMPRAS = [39, 41] as const;

// Claves del registro manual, en el orden de `manualLabels` (f29/model.ts:20-24).
const CLAVES_MANUALES = [
  'voucherNet',
  'importation',
  'previousCredit',
  'retained',
  'singleTax',
  'loanSalary',
  'loanFees',
  'withholding',
  'contributions',
  'fees',
] as const;
type ManualKey = (typeof CLAVES_MANUALES)[number];
type Manual = Record<ManualKey, number>;

const MONTO_MAX = 1e12; // espejo de `safe()` en validateDatabase (f29/model.ts:236)
const FILAS_MAX = 20000; // espejo de f29/model.ts:245
const ANIO_MIN = 2000;
const ANIO_MAX = 2099;
const FECHA_RCV_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const ESTADO_BORRADOR = 'Borrador' as Varchar<30>;
const ESTADO_REVISADO = 'Revisado' as Varchar<30>;

type FilaValidada = {
  code: number;
  rut: string;
  name: string;
  folio: string;
  date: string;
  exempt: number;
  net: number;
  iva: number;
  total: number;
};

type FuenteValidada = { name: string | null; rows: FilaValidada[] };

@Injectable()
export class F29Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodos: PeriodosService,
  ) {}

  // QUÉ HACE: devuelve la proyección F29 del cliente para (anio, mes) en el
  //   mismo shape que acepta el PUT — `null` si aún no existe (la vista abre
  //   un borrador nuevo sin romper).
  async obtener(clienteIdRaw: string, anioRaw: string, mesRaw: string) {
    const clienteId = this.parseId(clienteIdRaw, 'clienteId');
    const anio = this.parseAnio(anioRaw);
    const mes = this.parseMes(mesRaw);

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodo = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
    if (!periodo) return null;

    const proyeccion = await this.prisma.db.orm.public.ProyeccionF29
      .where({ periodoId: periodo.id }).first();
    if (!proyeccion) return null;

    const movimientos = await this.prisma.db.orm.public.F29Movimiento
      .where({ proyeccionId: proyeccion.id })
      .orderBy((m) => m.orden.asc())
      .orderBy((m) => m.id.asc())
      .all();
    const filasDe = (tipo: 'venta' | 'compra') =>
      movimientos
        .filter((m) => m.tipo === tipo)
        .map((m) => ({
          code: Number(m.codigoDocumento),
          rut: m.rut,
          name: m.nombre,
          folio: m.folio,
          date: m.fecha,
          exempt: Number(m.exento),
          net: Number(m.neto),
          iva: Number(m.iva),
          total: Number(m.total),
        }));

    const ventas = filasDe('venta');
    const compras = filasDe('compra');
    return {
      clienteId: clienteIdRaw,
      anio,
      mes,
      version: proyeccion.version,
      estado: proyeccion.estado,
      reviewed: proyeccion.estado === 'Revisado',
      generadoEn: proyeccion.generadoEn ? String(proyeccion.generadoEn) : null,
      manual: {
        voucherNet: Number(proyeccion.netoVoucher),
        importation: Number(proyeccion.ivaImportacion),
        previousCredit: Number(proyeccion.remanenteAnterior),
        retained: Number(proyeccion.retenciones),
        singleTax: Number(proyeccion.impuestoUnico),
        loanSalary: Number(proyeccion.prestamoRemuneraciones),
        loanFees: Number(proyeccion.prestamoHonorarios),
        withholding: Number(proyeccion.retencionHonorarios),
        contributions: Number(proyeccion.cotizaciones),
        fees: Number(proyeccion.honorarios),
      },
      ppmRate: Number(proyeccion.ppmTasa),
      ppmOverride: proyeccion.ppmMontoManual === null || proyeccion.ppmMontoManual === undefined
        ? null
        : Number(proyeccion.ppmMontoManual),
      ventas: proyeccion.ventasFuente === null && !ventas.length
        ? null
        : { name: proyeccion.ventasFuente ?? '', rows: ventas },
      compras: proyeccion.comprasFuente === null && !compras.length
        ? null
        : { name: proyeccion.comprasFuente ?? '', rows: compras },
    };
  }
  // QUÉ HACE: reemplazo total de la proyección en una transacción — crea el
  //   período si falta (`periodos.asegurar`), borra la proyección anterior
  //   (el detalle cae por `ON DELETE CASCADE`) y crea proyección + detalle.
  // REGLA: una proyección por período (única `periodoId` en el contrato).
  // AGREGADOS: calculados aquí con las mismas fórmulas que `calculate()`
  //   (f29/model.ts:191-199) — si cambia una, cambia la otra.
  async guardar(clienteIdRaw: string, data: GuardarProyeccionDto, usuarioId: string) {
    const clienteId = this.parseId(clienteIdRaw, 'clienteId');
    const anio = this.parseAnio(data.anio);
    const mes = this.parseMes(data.mes);
    const manual = this.validarManual(data.manual);
    const ppmRate = this.validarPpmRate(data.ppmRate);
    const ppmOverride = this.validarPpmOverride(data.ppmOverride);
    const reviewed = data.reviewed;
    if (typeof reviewed !== 'boolean') {
      throw new BadRequestException('El campo "reviewed" debe ser booleano.');
    }
    const ventas = this.validarFuente(data.ventas, 'ventas');
    const compras = this.validarFuente(data.compras, 'compras');

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodoId = await this.periodos.asegurar(clienteId, anio, mes);
    const r = this.calcular(manual, ventas, compras, ppmRate, ppmOverride);
    const estado = reviewed ? ESTADO_REVISADO : ESTADO_BORRADOR;
    const autor = BigInt(usuarioId);

    await this.prisma.db.transaction(async (tx) => {
      const anterior = await tx.orm.public.ProyeccionF29
        .where({ periodoId }).first();
      if (anterior) {
        await tx.orm.public.ProyeccionF29.where({ id: anterior.id }).delete();
      }

      const proyeccion = await tx.orm.public.ProyeccionF29.create({
        periodoId,
        version: (anterior?.version ?? 0) + 1,
        ivaDebito: num14(r.debit),
        ivaCredito: num14(r.credit),
        remanenteAnterior: num14(manual.previousCredit),
        retenciones: num14(manual.retained),
        ppm: num14(r.ppm),
        impuestoEstimado: num14(r.ivaPayable),
        totalEstimado: num14(r.total),
        estado,
        generadoPor: autor,
        revisadoPor: reviewed ? autor : null,
        documentoGenerado: anterior?.documentoGenerado ?? null,
        generadoEn: Temporal.Now.instant(),
        ppmTasa: num63(ppmRate),
        ppmMontoManual: ppmOverride === null ? null : num14(ppmOverride),
        netoVoucher: num14(manual.voucherNet),
        ivaImportacion: num14(manual.importation),
        impuestoUnico: num14(manual.singleTax),
        prestamoRemuneraciones: num14(manual.loanSalary),
        prestamoHonorarios: num14(manual.loanFees),
        retencionHonorarios: num14(manual.withholding),
        cotizaciones: num14(manual.contributions),
        honorarios: num14(manual.fees),
        ventasFuente: ventas.name as Varchar<255> | null,
        comprasFuente: compras.name as Varchar<255> | null,
      });

      let orden = 1;
      for (const [tipo, fuente] of [
        ['venta', ventas],
        ['compra', compras],
      ] as const) {
        for (const fila of fuente.rows) {
          await tx.orm.public.F29Movimiento.create({
            proyeccionId: proyeccion.id,
            tipo: tipo as Varchar<10>,
            orden: orden++,
            codigoDocumento: fila.code,
            rut: fila.rut as Varchar<20>,
            folio: fila.folio as Varchar<30>,
            nombre: fila.name as Varchar<200>,
            fecha: fila.date as Varchar<10>,
            exento: num14(fila.exempt),
            neto: num14(fila.net),
            iva: num14(fila.iva),
            total: num14(fila.total),
          });
        }
      }
    });

    return this.obtener(clienteIdRaw, String(anio), String(mes));
  }
  // QUÉ HACE: replica `calculate()` de f29/model.ts:191-199.
  // EVITAR: cambiar una fórmula aquí sin cambiarla también en el frontend.
  private calcular(
    m: Manual,
    ventas: FuenteValidada,
    compras: FuenteValidada,
    ppmRate: number,
    ppmOverride: number | null,
  ) {
    const suma = (filas: FilaValidada[]) =>
      filas.reduce(
        (a, f) => ({
          exempt: a.exempt + f.exempt,
          net: a.net + f.net,
          iva: a.iva + f.iva,
          total: a.total + f.total,
        }),
        { exempt: 0, net: 0, iva: 0, total: 0 },
      );
    const s = suma(ventas.rows);
    const c = suma(compras.rows);

    const voucherIva = Math.round(m.voucherNet * 0.19);
    const debit = s.iva + voucherIva;
    const credit = c.iva + m.importation + m.previousCredit;
    const ivaPayable = Math.max(0, debit - credit);
    const ppm = ppmOverride ?? Math.round(Math.max(0, s.net + m.voucherNet) * ppmRate / 100);
    const taxes = ivaPayable + m.retained + m.singleTax + m.loanSalary
      + m.loanFees + m.withholding + ppm;
    const total = taxes + m.contributions + m.fees;
    return { debit, credit, ivaPayable, ppm, total };
  }

  private validarManual(raw: unknown): Manual {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException(`El body debe incluir "manual" con las claves: ${CLAVES_MANUALES.join(', ')}.`);
    }
    const registro = raw as Record<string, unknown>;
    const clavesValidas = new Set<string>(CLAVES_MANUALES);
    for (const clave of Object.keys(registro)) {
      if (!clavesValidas.has(clave)) {
        throw new BadRequestException(`Clave manual desconocida: "${clave}".`);
      }
    }
    const manual = {} as Manual;
    for (const clave of CLAVES_MANUALES) {
      const valor = registro[clave];
      if (!this.esMontoSeguro(valor)) {
        throw new BadRequestException(`El monto manual "${clave}" debe ser un entero entre 0 y ${MONTO_MAX}.`);
      }
      manual[clave] = valor as number;
    }
    return manual;
  }

  private validarPpmRate(raw: unknown): number {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 100) {
      throw new BadRequestException('ppmRate inválido: debe ser un número entre 0 y 100.');
    }
    return raw;
  }

  private validarPpmOverride(raw: unknown): number | null {
    if (raw === null || raw === undefined) return null;
    if (!this.esMontoSeguro(raw)) {
      throw new BadRequestException(`ppmOverride inválido: debe ser null o un entero entre 0 y ${MONTO_MAX}.`);
    }
    return raw as number;
  }
  private validarFuente(raw: unknown, tipo: 'ventas' | 'compras'): FuenteValidada {
    if (raw === null || raw === undefined) return { name: null, rows: [] };
    if (typeof raw !== 'object') {
      throw new BadRequestException(`"${tipo}" debe ser un objeto con name y rows.`);
    }
    const fuente = raw as { name?: unknown; rows?: unknown };
    if (fuente.name !== undefined && fuente.name !== null && typeof fuente.name !== 'string') {
      throw new BadRequestException(`El nombre de archivo de "${tipo}" debe ser texto.`);
    }
    const name = typeof fuente.name === 'string' && fuente.name.trim()
      ? fuente.name.trim().slice(0, 255)
      : null;
    if (!Array.isArray(fuente.rows)) {
      throw new BadRequestException(`"${tipo}" debe incluir "rows" como lista de documentos.`);
    }
    if (fuente.rows.length > FILAS_MAX) {
      throw new BadRequestException(`"${tipo}" supera el máximo de ${FILAS_MAX} documentos.`);
    }

    const permitidos = new Set<number>(
      tipo === 'compras'
        ? CODIGOS_SOPORTADOS.filter((c) => !(CODIGOS_EXCLUIDOS_COMPRAS as readonly number[]).includes(c))
        : CODIGOS_SOPORTADOS,
    );
    const vistos = new Set<string>();
    const rows: FilaValidada[] = fuente.rows.map((cruda, i) => {
      const fila = cruda as MovimientoLike;
      if (!fila || typeof fila !== 'object') {
        throw new BadRequestException(`Documento inválido en "${tipo}" fila ${i + 1}.`);
      }
      if (!Number.isInteger(fila.code) || !permitidos.has(fila.code)) {
        throw new BadRequestException(
          `Tipo de documento ${String(fila.code)} no contemplado en "${tipo}" (fila ${i + 1}).`,
        );
      }
      for (const campo of ['rut', 'name', 'folio', 'date'] as const) {
        if (typeof fila[campo] !== 'string') {
          throw new BadRequestException(`Falta el campo "${campo}" en "${tipo}" fila ${i + 1}.`);
        }
      }
      const rut = this.normalizarRut(fila.rut);
      const nombre = fila.name.trim();
      if (!rut || !fila.folio.trim() || !nombre) {
        throw new BadRequestException(`Faltan datos del documento en "${tipo}" fila ${i + 1}.`);
      }
      if (rut.length > 20 || fila.folio.trim().length > 30 || nombre.length > 200) {
        throw new BadRequestException(`Datos del documento demasiado largos en "${tipo}" fila ${i + 1}.`);
      }
      const date = this.validarFechaRcv(fila.date, tipo, i + 1);
      const montos = {} as Pick<FilaValidada, 'exempt' | 'net' | 'iva' | 'total'>;
      for (const campo of ['exempt', 'net', 'iva', 'total'] as const) {
        const n = fila[campo];
        const signoValido = fila.code === 61 ? n <= 0 : n >= 0;
        if (typeof n !== 'number' || !this.esMontoSeguro(Math.abs(n)) || !signoValido) {
          throw new BadRequestException(
            `Monto "${campo}" inválido en "${tipo}" fila ${i + 1}: debe ser entero`
            + (fila.code === 61 ? ' ≤ 0 (nota de crédito).' : ' ≥ 0.'),
          );
        }
        montos[campo] = n;
      }
      const clave = `${fila.code}|${rut}|${fila.folio.trim()}`;
      if (vistos.has(clave)) {
        throw new BadRequestException(`Documento duplicado en "${tipo}": folio ${fila.folio.trim()}.`);
      }
      vistos.add(clave);
      return {
        code: fila.code,
        rut,
        name: nombre,
        folio: fila.folio.trim(),
        date,
        ...montos,
      };
    });

    // Espejo de f29/model.ts:256 — la suma debe caber en entero seguro.
    for (const campo of ['exempt', 'net', 'iva', 'total'] as const) {
      const suma = rows.reduce((s, f) => s + f[campo], 0);
      if (!Number.isSafeInteger(suma)) {
        throw new BadRequestException(`El total de "${tipo}" excede la precisión admitida.`);
      }
    }
    return { name, rows };
  }

  private validarFechaRcv(raw: string, tipo: string, fila: number): string {
    const partes = raw.match(FECHA_RCV_REGEX);
    if (!partes) {
      throw new BadRequestException(`Fecha inválida en "${tipo}" fila ${fila}: usa el formato DD/MM/YYYY.`);
    }
    const dia = partes[1]!;
    const mes = partes[2]!;
    const anio = partes[3]!;
    const fecha = new Date(`${anio}-${mes}-${dia}T12:00:00`);
    if (fecha.getDate() !== Number(dia) || fecha.getMonth() + 1 !== Number(mes)) {
      throw new BadRequestException(`Fecha inválida en "${tipo}" fila ${fila}: "${raw}".`);
    }
    return raw;
  }

  private normalizarRut(rut: string): string {
    return rut.replace(/[.\s]/g, '').toUpperCase();
  }

  private esMontoSeguro(valor: unknown): boolean {
    return typeof valor === 'number'
      && Number.isSafeInteger(valor)
      && valor >= 0
      && valor <= MONTO_MAX;
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
}

// Shape crudo de una fila del body (solo para tipar el acceso por campo).
type MovimientoLike = {
  code: number;
  rut: string;
  name: string;
  folio: string;
  date: string;
  exempt: number;
  net: number;
  iva: number;
  total: number;
};