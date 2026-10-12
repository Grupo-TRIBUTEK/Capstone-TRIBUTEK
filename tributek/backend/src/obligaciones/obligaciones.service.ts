import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Numeric, Varchar } from '@prisma/orm-postgres/target/codec-types';
import 'temporal-polyfill/global';
import {
  parseAnio,
  parseFechaIso,
  parseFechaIsoOpcional,
  parseId,
  parseMes,
} from '../common/parse.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PeriodosService } from '../periodos/periodos.service.js';
import { GuardarMesDto } from './dto/guardar-mes.dto.js';
import { GuardarPostergacionDto } from './dto/guardar-postergacion.dto.js';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto.js';

// El codec pg/numeric recibe texto decimal con la escala de la columna
// (input branded `Numeric<P, S>`, no `number`) — helper igual al de F29.
const num14 = (n: number): Numeric<14, 2> => n.toFixed(2) as Numeric<14, 2>;

// Catálogo de conceptos, en el orden de `concepts` (ficha/model.ts:1-11).
// QUÉ HACE: única fuente de verdad del backend para validar montos y abonos.
// EVITAR: agregar/quitar conceptos aquí sin cambiar también `model.ts`.
const CONCEPTOS = [
  'Honorarios',
  'Impuestos',
  'Formalización',
  'Retención boletas',
  'Cotizaciones',
  'Postergación',
  'Convenio',
  'Cobranza',
  'Otro',
] as const;
type Concepto = (typeof CONCEPTOS)[number];

// Límites de contenido espejo de `saveMonth` y `addPayment` (ficha/model.ts).
// EVITAR: los topes de almacenamiento local (1200 meses, 5000 abonos) NO se
// replican aquí — son cortos del localStorage, no reglas de negocio.
const MONTO_MAX = 999999999;
const PASOS_MAX = 20;
const PASO_TEXTO_MAX = 180;
const SEGUIMIENTO_NOTA_MAX = 500;
const ABONO_NOTA_MAX = 300;
const POSTERGACION_NOTA_MAX = 500;
const TRANSFER_ID_MAX = 255;
const METODO_MAX = 30;
const CUENTA_MAX = 200;
const DESTINOS = ['tributek', 'institution'] as const;

type PasoForma = { id: string; text: string; done: boolean };

// Shape espejo de `Month` (ficha/model.ts:27-36) — lo que consume la vista.
type MesForma = {
  clientId: string;
  period: string;
  amounts: Record<string, number>;
  sent: boolean;
  steps: PasoForma[];
  followDate: string;
  followNote: string;
  followDone: boolean;
};

// Shape espejo de `AppliedPayment` (management/model.ts:76-83) — el abono
// con sus metadatos de transferencia.
type AbonoForma = {
  id: string;
  clientId: string;
  period: string;
  concept: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
  transferId: string | null;
  method: string | null;
  originAccount: string | null;
  receivingAccount: string | null;
  destination: string | null;
  deferredId: string | null;
};

// Shape espejo de `Deferral` (management/model.ts:29-37).
type PostergacionForma = {
  id: string;
  clientId: string;
  period: string;
  concept: string;
  amount: number;
  due: string;
  note: string;
};

const etiquetaPeriodo = (anio: number, mes: number) =>
  `${anio}-${String(mes).padStart(2, '0')}`;

@Injectable()
export class ObligacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodos: PeriodosService,
  ) {}

  // QUÉ HACE: devuelve los meses, abonos y postergaciones del cliente en
  //   el shape de `Data` de `ficha/model.ts` (months + payments) y
  //   `Management.deferrals` para hidratar la vista sin transformaciones.
  //   Los períodos sin mes guardado salen como borrador (montos en 0,
  //   sin enviado), igual que `newMonth`.
  // ALIMENTA: la vista Obligaciones (totales de la pestaña y ledger de
  //   abonos) y la pestaña Postergaciones.
  async listarMeses(clienteIdRaw: string) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodos = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId })
      .orderBy((p) => p.anio.asc())
      .orderBy((p) => p.mes.asc())
      .all();
    if (!periodos.length) return { months: [], payments: [], deferrals: [] };

    // Una consulta por tabla con `in` — evita el N+1 de recorrer períodos.
    const periodoIds = periodos.map((p) => p.id);
    const meses = await this.prisma.db.orm.public.MesCliente
      .where((m) => m.periodoId.in(periodoIds)).all();
    const mesPorPeriodo = new Map(meses.map((m) => [m.periodoId, m]));
    const mesIds = meses.map((m) => m.id);

    const montos = mesIds.length
      ? await this.prisma.db.orm.public.MontoConcepto
        .where((m) => m.mesId.in(mesIds)).all()
      : [];
    const pasos = mesIds.length
      ? await this.prisma.db.orm.public.PasoMes
        .where((p) => p.mesId.in(mesIds))
        .orderBy((p) => p.orden.asc())
        .orderBy((p) => p.id.asc())
        .all()
      : [];
    const abonos = mesIds.length
      ? await this.prisma.db.orm.public.AbonoMes
        .where((a) => a.mesId.in(mesIds))
        .orderBy((a) => a.id.asc())
        .all()
      : [];
    const postergaciones = await this.prisma.db.orm.public.PostergacionMes
      .where({ clienteId })
      .orderBy((p) => p.anio.asc())
      .orderBy((p) => p.mes.asc())
      .orderBy((p) => p.id.asc())
      .all();

    const de = (mesId: bigint | undefined, filas: { mesId: bigint }[]) =>
      mesId ? filas.filter((f) => f.mesId === mesId) : [];

    const months: MesForma[] = periodos.map((periodo) => {
      const mesRow = mesPorPeriodo.get(periodo.id);
      return this.formaMes(periodo, mesRow ?? null,
        de(mesRow?.id, montos), de(mesRow?.id, pasos), clienteIdRaw);
    });

    const periodoDeMes = new Map(meses.map((m) => [m.id, m.periodoId]));
    const periodoPorId = new Map(periodos.map((p) => [p.id, p]));
    const payments: AbonoForma[] = abonos.map((abono) => {
      const periodo = periodoPorId.get(periodoDeMes.get(abono.mesId) ?? 0n);
      if (!periodo) {
        throw new NotFoundException('Período del abono no encontrado.');
      }
      return this.formaAbono(abono, periodo, clienteIdRaw);
    });

    const deferrals: PostergacionForma[] = postergaciones.map((p) =>
      this.formaPostergacion(p, clienteIdRaw));

    return { months, payments, deferrals };
  }

  // QUÉ HACE: devuelve TODAS las obligaciones de TODOS los clientes
  //   para la vista "Obligaciones" — meses, abonos, postergaciones,
  //   facturas — con filtros opcionales por período. Evita N+1
  //   usando consultas con `in` por tabla.
  async listarTodo(periodo?: string) {
    const clientes = await this.prisma.db.orm.public.Cliente
      .where((c) => c.estado.neq('Inactivo' as Varchar<30>))
      .all();

    const vacio = {
      clients: clientes.map((c) => this.formaCliente(c)),
      months: [] as MesForma[],
      payments: [] as AbonoForma[],
      deferrals: [] as PostergacionForma[],
      invoices: [],
    };

    if (!clientes.length) return vacio;

    const clienteIds = clientes.map((c) => c.id);
    const periodoIds = await this.periodos.obtenerIdsPorClientes(clienteIds);

    if (!periodoIds.length) return vacio;

    // Filtro opcional por período (formato "YYYY-MM")
    let periodoIdsFiltrados = periodoIds;
    if (periodo) {
      const [anioStr, mesStr] = periodo.split('-');
      const anio = parseAnio(anioStr);
      const mes = parseMes(mesStr);
      const periodoId = await this.periodos.asegurarIds(anio, mes);
      periodoIdsFiltrados = periodoId ? periodoIds.filter((id) => id === periodoId) : [];
    }

    if (!periodoIdsFiltrados.length) return vacio;

    // Consultas en batch para evitar N+1
    const mesRows = await this.prisma.db.orm.public.MesCliente
      .where((m) => m.periodoId.in(periodoIdsFiltrados)).all();
    const mesPorPeriodo = new Map(mesRows.map((m) => [m.periodoId, m]));
    const mesIds = mesRows.map((m) => m.id);

    const [montos, pasos, abonos, postergaciones, facturas] = await Promise.all([
      mesIds.length
        ? this.prisma.db.orm.public.MontoConcepto.where((m) => m.mesId.in(mesIds)).all()
        : [],
      mesIds.length
        ? this.prisma.db.orm.public.PasoMes.where((p) => p.mesId.in(mesIds)).orderBy((p) => p.orden.asc()).all()
        : [],
      mesIds.length
        ? this.prisma.db.orm.public.AbonoMes.where((a) => a.mesId.in(mesIds)).orderBy((a) => a.id.asc()).all()
        : [],
      this.prisma.db.orm.public.PostergacionMes.where((p) => p.clienteId.in(clienteIds)).orderBy((p) => p.anio.asc()).orderBy((p) => p.mes.asc()).all(),
      this.prisma.db.orm.public.Factura.where((f) => f.clienteId.in(clienteIds)).all(),
    ]);

    const montosPorMes = new Map<bigint, typeof montos>();
    for (const m of montos) {
      const arr = montosPorMes.get(m.mesId) ?? [];
      arr.push(m);
      montosPorMes.set(m.mesId, arr);
    }
    const pasosPorMes = new Map<bigint, typeof pasos>();
    for (const p of pasos) {
      const arr = pasosPorMes.get(p.mesId) ?? [];
      arr.push(p);
      pasosPorMes.set(p.mesId, arr);
    }
    const abonosPorMes = new Map<bigint, typeof abonos>();
    for (const a of abonos) {
      const arr = abonosPorMes.get(a.mesId) ?? [];
      arr.push(a);
      abonosPorMes.set(a.mesId, arr);
    }

    const periodoPorId = await this.periodos.obtenerPorIds(periodoIdsFiltrados);

    // Recorrido en memoria: los períodos ya traen clienteId y los rows
    //   relacionados están agrupados por mesId, así que no hay N+1.
    const months: MesForma[] = [];
    const payments: AbonoForma[] = [];

    for (const periodo of periodoPorId.values()) {
      const clienteIdRaw = String(periodo.clienteId);
      const mesRow = mesPorPeriodo.get(periodo.id) ?? null;
      const mesId = mesRow?.id;

      months.push(this.formaMes(periodo, mesRow,
        mesId ? montosPorMes.get(mesId) ?? [] : [],
        mesId ? pasosPorMes.get(mesId) ?? [] : [],
        clienteIdRaw));

      if (mesId) {
        for (const abono of abonosPorMes.get(mesId) ?? []) {
          payments.push(this.formaAbono(abono, periodo, clienteIdRaw));
        }
      }
    }

    // La consulta ya filtró por clienteId, así que no hace falta refiltrar.
    const deferrals = postergaciones
      .map((p) => this.formaPostergacion(p, String(p.clienteId)));

    const invoices = facturas.map((f) => ({
      id: String(f.id),
      clienteId: String(f.clienteId),
      anio: f.anio,
      mes: f.mes,
      tipo: f.tipo,
      nombre: f.nombre,
      rut: f.rut,
      descripcion: f.descripcion,
      monto: Number(f.monto),
      numero: f.numero ?? '',
      fecha: f.fecha?.toString().split('T')[0] ?? '',
      nota: f.nota ?? '',
      creadoEn: f.creadoEn?.toString() ?? '',
    }));

    return {
      clients: clientes.map((c) => this.formaCliente(c)),
      months,
      payments,
      deferrals: deferrals as PostergacionForma[],
      invoices,
    };
  }

  // Shape espejo del directorio de clientes que consume la vista.
  private formaCliente(c: {
    id: bigint;
    tipoCliente: Varchar<20>;
    rut: Varchar<20>;
    nombreRazonSocial: Varchar<180>;
    contactoPrincipal: Varchar<120> | null;
    emailContacto: Varchar<150> | null;
    telefono: Varchar<30> | null;
    direccion: Varchar<250> | null;
    estado: Varchar<30>;
    creadoEn: Temporal.Instant | null;
    actualizadoEn: Temporal.Instant | null;
  }) {
    return {
      id: String(c.id),
      tipoCliente: c.tipoCliente,
      rut: c.rut,
      nombreRazonSocial: c.nombreRazonSocial,
      contactoPrincipal: c.contactoPrincipal ?? '',
      emailContacto: c.emailContacto ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      estado: c.estado,
      creadoEn: c.creadoEn?.toString() ?? '',
      actualizadoEn: c.actualizadoEn?.toString() ?? '',
    };
  }

  // QUÉ HACE: upsert del mes — crea (cliente, año, mes) si no existe y
  //   REEMPLAZA montos y pasos por los del body, sin tocar los abonos
  //   registrados (espejo de `saveMonth`, que valida contra `paid`).
  //   El monto no puede bajar de lo ya abonado más lo postergado
  //   (espejo de `balance() < 0` en `validateLedger`).
  async guardarMes(clienteIdRaw: string, data: GuardarMesDto) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const sent = this.parseBoolean(data.sent, 'sent', false);
    const followDone = this.parseBoolean(data.followDone, 'followDone', false);
    const followDate = parseFechaIsoOpcional(data.followDate, 'followDate');
    const followNote = this.parseTexto(data.followNote, 'followNote', SEGUIMIENTO_NOTA_MAX);
    if (followDone && !followDate) {
      throw new BadRequestException('Indica la fecha del seguimiento antes de marcarlo realizado.');
    }
    const amounts = this.validarAmounts(data.amounts);
    const steps = this.validarSteps(data.steps);

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodoId = await this.periodos.asegurar(clienteId, anio, mes);

    await this.prisma.db.transaction(async (tx) => {
      const actual = await tx.orm.public.MesCliente
        .where({ periodoId }).first();
      const abonos = actual
        ? await tx.orm.public.AbonoMes.where({ mesId: actual.id }).all()
        : [];
      const pagado = new Map<string, number>();
      for (const abono of abonos) {
        pagado.set(abono.concepto, (pagado.get(abono.concepto) ?? 0) + Number(abono.monto));
      }
      // Postergaciones del período: su monto pendiente también compromete
      // el concepto (abonos contra ellas ya están en `pagado`).
      const postergaciones = await tx.orm.public.PostergacionMes
        .where({ clienteId, anio, mes }).all();
      const postIds = postergaciones.map((p) => p.id);
      const pagadoPost = new Map<string, number>();
      if (postIds.length) {
        const abonadosPost = await tx.orm.public.AbonoMes
          .where((a) => a.postergacionId.in(postIds)).all();
        for (const abono of abonadosPost) {
          pagadoPost.set(abono.concepto, (pagadoPost.get(abono.concepto) ?? 0) + Number(abono.monto));
        }
      }
      for (const c of CONCEPTOS) {
        const comprometido = (pagado.get(c) ?? 0)
          + postergaciones
            .filter((p) => p.concepto === c)
            .reduce((s, p) => s + Number(p.monto), 0)
          - (pagadoPost.get(c) ?? 0);
        if (amounts[c] < comprometido) {
          throw new BadRequestException(
            `No puedes reducir ${c} por debajo de sus abonos y postergaciones.`,
          );
        }
      }

      const ahora = Temporal.Now.instant();
      let mesId: bigint;
      if (actual) {
        await tx.orm.public.MesCliente.where({ id: actual.id }).update({
          enviado: sent,
          seguimientoFecha: followDate,
          seguimientoNota: followNote as Varchar<500>,
          seguimientoHecho: followDone,
          actualizadoEn: ahora,
        });
        mesId = actual.id;
        await tx.orm.public.MontoConcepto.where({ mesId }).delete();
        await tx.orm.public.PasoMes.where({ mesId }).delete();
      } else {
        const creado = await tx.orm.public.MesCliente.create({
          periodoId,
          enviado: sent,
          seguimientoFecha: followDate,
          seguimientoNota: followNote as Varchar<500>,
          seguimientoHecho: followDone,
          creadoEn: ahora,
          actualizadoEn: ahora,
        });
        mesId = creado.id;
      }
      for (const c of CONCEPTOS) {
        await tx.orm.public.MontoConcepto.create({
          mesId,
          concepto: c as Varchar<60>,
          monto: num14(amounts[c]),
        });
      }
      for (const [i, paso] of steps.entries()) {
        await tx.orm.public.PasoMes.create({
          mesId,
          orden: i + 1,
          texto: paso.text as Varchar<180>,
          hecho: paso.done,
        });
      }
    });

    const periodo = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
    const mesRow = await this.prisma.db.orm.public.MesCliente
      .where({ periodoId }).first();
    if (!periodo || !mesRow) {
      // Inalcanzable en la práctica: la transacción creó/mantuvo ambas filas.
      throw new NotFoundException('Período o mes no encontrado tras guardar.');
    }
    const montos = await this.prisma.db.orm.public.MontoConcepto
      .where({ mesId: mesRow.id }).all();
    const pasos = await this.prisma.db.orm.public.PasoMes
      .where({ mesId: mesRow.id })
      .orderBy((p) => p.orden.asc())
      .orderBy((p) => p.id.asc())
      .all();
    return this.formaMes(periodo, mesRow, montos, pasos, clienteIdRaw);
  }

  // QUÉ HACE: registra un abono contra un concepto del mes (espejo de
  //   `addPayment`: exige mes ya guardado, saldo suficiente y fecha no
  //   futura). Con `deferredId` el abono se registra contra una
  //   postergación y el saldo se mide sobre ella, no sobre el concepto.
  async registrarAbono(clienteIdRaw: string, data: RegistrarAbonoDto) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const concepto = this.parseConcepto(data.concept);
    const amount = this.parseMontoPositivo(data.amount);
    const date = parseFechaIso(data.date, 'date');
    const note = this.parseTexto(data.note, 'note', ABONO_NOTA_MAX);
    const meta = this.parseMetadatosAbono(data);
    const hoy = Temporal.Now.plainDateISO();
    if (Temporal.PlainDate.compare(date, hoy) > 0) {
      throw new BadRequestException('Indica una fecha de pago válida, no futura.');
    }

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodo = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
    const mesRow = periodo
      ? await this.prisma.db.orm.public.MesCliente.where({ periodoId: periodo.id }).first()
      : null;
    if (!periodo || !mesRow) {
      throw new BadRequestException('Guarda primero los conceptos de ese período.');
    }

    const abono = await this.prisma.db.transaction(async (tx) => {
      let postergacionId: bigint | null = null;
      if (meta.postergacionId !== null) {
        const postergacion = await tx.orm.public.PostergacionMes
          .where({ id: meta.postergacionId }).first();
        if (!postergacion) throw new BadRequestException('Postergación no encontrada.');
        if (postergacion.clienteId !== clienteId || postergacion.anio !== anio
          || postergacion.mes !== mes || postergacion.concepto !== concepto) {
          throw new BadRequestException('El abono no corresponde a la postergación.');
        }
        const abonadosPost = await tx.orm.public.AbonoMes
          .where({ postergacionId: postergacion.id }).all();
        const saldoPost = Number(postergacion.monto)
          - abonadosPost.reduce((s: number, a: any) => s + Number(a.monto), 0);
        if (amount > saldoPost) {
          throw new BadRequestException(
            'El abono supera el saldo de la postergación. Distribuye solo el monto que corresponde.',
          );
        }
        postergacionId = postergacion.id;
      } else {
        const saldo = await this.saldoConcepto(tx, mesRow.id, { clienteId, anio, mes }, concepto);
        if (amount > saldo) {
          throw new BadRequestException(
            'El abono supera el saldo del concepto. Distribuye solo el monto que corresponde.',
          );
        }
      }
      return tx.orm.public.AbonoMes.create({
        mesId: mesRow.id,
        concepto: concepto as Varchar<60>,
        monto: num14(amount),
        fecha: date,
        nota: note as Varchar<300>,
        transferId: meta.transferId as Varchar<255> | null,
        metodo: meta.metodo as Varchar<30> | null,
        cuentaOrigen: meta.cuentaOrigen as Varchar<200> | null,
        cuentaDestino: meta.cuentaDestino as Varchar<200> | null,
        destino: meta.destino as Varchar<20> | null,
        postergacionId,
        creadoEn: Temporal.Now.instant(),
      });
    });

    return this.formaAbono(abono, periodo, clienteIdRaw);
  }

  // QUÉ HACE: elimina un abono por id (la vista permite corregir
  //   distribuciones erróneas). No valida saldo: solo quita el movimiento.
  async eliminarAbono(abonoIdRaw: string) {
    const abonoId = parseId(abonoIdRaw, 'abonoId');
    const abono = await this.prisma.db.orm.public.AbonoMes
      .where({ id: abonoId }).first();
    if (!abono) throw new NotFoundException('Abono no encontrado.');

    const mesRow = await this.prisma.db.orm.public.MesCliente
      .where({ id: abono.mesId }).first();
    const periodo = mesRow
      ? await this.prisma.db.orm.public.PeriodoCliente
        .where({ id: mesRow.periodoId }).first()
      : null;
    const cliente = periodo
      ? await this.prisma.db.orm.public.Cliente.where({ id: periodo.clienteId }).first()
      : null;

    await this.prisma.db.orm.public.AbonoMes.where({ id: abonoId }).delete();
    if (!periodo || !cliente) return { id: abonoIdRaw, deleted: true };
    return {
      ...this.formaAbono(abono, periodo, String(periodo.clienteId)),
      deleted: true,
    };
  }

  // QUÉ HACE: lista las postergaciones del cliente (pestaña
  //   Postergaciones), ordenadas por período y id.
  async listarPostergaciones(clienteIdRaw: string) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const postergaciones = await this.prisma.db.orm.public.PostergacionMes
      .where({ clienteId })
      .orderBy((p) => p.anio.asc())
      .orderBy((p) => p.mes.asc())
      .orderBy((p) => p.id.asc())
      .all();
    return postergaciones.map((p) => this.formaPostergacion(p, clienteIdRaw));
  }

  // QUÉ HACE: crea una postergación (espejo de `postpone`: exige mes
  //   guardado, concepto válido, monto ≤ saldo del concepto y vencimiento
  //   no anterior al período).
  async crearPostergacion(clienteIdRaw: string, data: GuardarPostergacionDto) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const concepto = this.parseConcepto(data.concept);
    const amount = this.parseMontoPositivo(data.amount);
    const due = parseFechaIso(data.due, 'due');
    const note = this.parseTexto(data.note, 'note', POSTERGACION_NOTA_MAX);

    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const periodo = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId, anio, mes }).first();
    const mesRow = periodo
      ? await this.prisma.db.orm.public.MesCliente.where({ periodoId: periodo.id }).first()
      : null;
    if (!periodo || !mesRow) {
      throw new BadRequestException('Guarda primero los conceptos de ese período.');
    }

    const inicio = Temporal.PlainDate.from(
      `${anio}-${String(mes).padStart(2, '0')}-01`,
    );
    if (Temporal.PlainDate.compare(due, inicio) < 0) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior al período.',
      );
    }

    const postergacion = await this.prisma.db.transaction(async (tx) => {
      const saldo = await this.saldoConcepto(tx, mesRow.id, { clienteId, anio, mes }, concepto);
      if (amount > saldo) {
        throw new BadRequestException('El monto supera el saldo disponible.');
      }
      return tx.orm.public.PostergacionMes.create({
        clienteId,
        anio,
        mes,
        concepto: concepto as Varchar<60>,
        monto: num14(amount),
        vencimiento: due,
        nota: note as Varchar<500>,
        creadoEn: Temporal.Now.instant(),
      });
    });

    return this.formaPostergacion(postergacion, clienteIdRaw);
  }

  // QUÉ HACE: edita una postergación (espejo del modal
  //   "Editar postergación": monto, vencimiento y observación;
  //   el período y concepto viajan iguales). El monto anterior
  //   se libera al editarlo, así que el nuevo cabe en el saldo
  //   actual más lo liberado; no puede bajar de lo abonado
  //   contra ella.
  async actualizarPostergacion(
    postergacionIdRaw: string,
    data: GuardarPostergacionDto,
  ) {
    const postergacionId = parseId(postergacionIdRaw, 'postergacionId');
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const concepto = this.parseConcepto(data.concept);
    const amount = this.parseMontoPositivo(data.amount);
    const due = parseFechaIso(data.due, 'due');
    const note = this.parseTexto(data.note, 'note', POSTERGACION_NOTA_MAX);

    const postergacion = await this.prisma.db.orm.public.PostergacionMes
      .where({ id: postergacionId }).first();
    if (!postergacion) throw new NotFoundException('Postergación no encontrada.');

    const periodo = await this.prisma.db.orm.public.PeriodoCliente
      .where({ clienteId: postergacion.clienteId, anio, mes }).first();
    const mesRow = periodo
      ? await this.prisma.db.orm.public.MesCliente.where({ periodoId: periodo.id }).first()
      : null;
    if (!periodo || !mesRow) {
      throw new BadRequestException('Guarda primero los conceptos de ese período.');
    }

    const inicio = Temporal.PlainDate.from(
      `${anio}-${String(mes).padStart(2, '0')}-01`,
    );
    if (Temporal.PlainDate.compare(due, inicio) < 0) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior al período.',
      );
    }

    const actualizado = await this.prisma.db.transaction(async (tx) => {
      const saldo = await this.saldoConcepto(
        tx, mesRow.id,
        { clienteId: postergacion.clienteId, anio, mes }, concepto,
      );
      // Si el período o concepto cambiaron, el monto anterior
      // ya no reserva espacio en el nuevo concepto.
      const mismoConcepto = postergacion.anio === anio
        && postergacion.mes === mes && postergacion.concepto === concepto;
      const limite = saldo + (mismoConcepto ? Number(postergacion.monto) : 0);
      if (amount > limite) {
        throw new BadRequestException('El monto supera el saldo disponible.');
      }
      const abonados = await tx.orm.public.AbonoMes
        .where({ postergacionId }).all();
      const pagado = abonados
        .reduce((s: number, a: any) => s + Number(a.monto), 0);
      if (amount < pagado) {
        throw new BadRequestException(
          'No puedes reducir la postergación por debajo de sus abonos.',
        );
      }
      await tx.orm.public.PostergacionMes.where({ id: postergacionId }).update({
        anio,
        mes,
        concepto: concepto as Varchar<60>,
        monto: num14(amount),
        vencimiento: due,
        nota: note as Varchar<500>,
      });
      return tx.orm.public.PostergacionMes
        .where({ id: postergacionId }).first();
    });

    if (!actualizado) {
      // Inalcanzable en la práctica: la transacción actualizó la fila.
      throw new NotFoundException('Postergación no encontrada.');
    }
    return this.formaPostergacion(actualizado, String(postergacion.clienteId));
  }

  // QUÉ HACE: elimina una postergación (espejo de `removeDeferral`:
  //   rechaza si tiene abonos asociados).
  async eliminarPostergacion(postergacionIdRaw: string) {
    const postergacionId = parseId(postergacionIdRaw, 'postergacionId');
    const postergacion = await this.prisma.db.orm.public.PostergacionMes
      .where({ id: postergacionId }).first();
    if (!postergacion) throw new NotFoundException('Postergación no encontrada.');

    const abonados = await this.prisma.db.orm.public.AbonoMes
      .where({ postergacionId }).all();
    if (abonados.length) {
      throw new BadRequestException(
        'Corrige primero los abonos asociados a esta postergación.',
      );
    }

    await this.prisma.db.orm.public.PostergacionMes
      .where({ id: postergacionId }).delete();
    return { id: postergacionIdRaw, deleted: true };
  }

  // QUÉ HACE: saldo disponible de un concepto del mes — el monto menos
  //   los abonos que no son contra postergación y menos los montos
  //   postergados (espejo de `balance()` de management/model.ts:
  //   amounts - paid - deferred). `tx` es la transacción de
  //   `db.transaction` (tipo generado por el contrato).
  private async saldoConcepto(
    tx: any,
    mesId: bigint,
    periodo: { clienteId: bigint; anio: number; mes: number },
    concepto: string,
  ): Promise<number> {
    const montos = await tx.orm.public.MontoConcepto.where({ mesId }).all();
    const delConcepto = montos.find((m: any) => m.concepto === concepto);
    const abonos = await tx.orm.public.AbonoMes.where({ mesId }).all();
    const pagado = abonos
      .filter((a: any) => a.concepto === concepto && a.postergacionId === null)
      .reduce((s: number, a: any) => s + Number(a.monto), 0);
    const postergaciones = await tx.orm.public.PostergacionMes
      .where({ clienteId: periodo.clienteId, anio: periodo.anio, mes: periodo.mes, concepto })
      .all();
    const postergado = postergaciones
      .reduce((s: number, p: any) => s + Number(p.monto), 0);
    return Number(delConcepto?.monto ?? 0) - pagado - postergado;
  }

  // QUÉ HACE: arma el shape `Month` de un período a partir de sus filas.
  //   `mesRow` null (período sin mes guardado) produce el borrador `newMonth`.
  private formaMes(
    periodo: { anio: number; mes: number },
    mesRow: Record<string, any> | null,
    montos: Record<string, any>[],
    pasos: Record<string, any>[],
    clientId: string,
  ): MesForma {
    const amounts = Object.fromEntries(CONCEPTOS.map((c) => [c, 0])) as Record<string, number>;
    for (const monto of montos) amounts[monto.concepto] = Number(monto.monto);
    return {
      clientId,
      period: etiquetaPeriodo(periodo.anio, periodo.mes),
      amounts,
      sent: mesRow ? mesRow.enviado : false,
      steps: pasos.map((p) => ({ id: String(p.id), text: p.texto, done: p.hecho })),
      followDate: mesRow?.seguimientoFecha ? String(mesRow.seguimientoFecha) : '',
      followNote: mesRow?.seguimientoNota ?? '',
      followDone: mesRow ? mesRow.seguimientoHecho : false,
    };
  }

  // QUÉ HACE: arma el shape `AppliedPayment` de un abono con su período
  //   y sus metadatos de transferencia.
  private formaAbono(
    abono: Record<string, any>,
    periodo: { anio: number; mes: number },
    clientId: string,
  ): AbonoForma {
    return {
      id: String(abono.id),
      clientId,
      period: etiquetaPeriodo(periodo.anio, periodo.mes),
      concept: abono.concepto,
      amount: Number(abono.monto),
      date: String(abono.fecha),
      note: abono.nota ?? '',
      createdAt: abono.creadoEn ? String(abono.creadoEn) : '',
      transferId: abono.transferId ?? null,
      method: abono.metodo ?? null,
      originAccount: abono.cuentaOrigen ?? null,
      receivingAccount: abono.cuentaDestino ?? null,
      destination: abono.destino ?? null,
      deferredId: abono.postergacionId === null || abono.postergacionId === undefined
        ? null
        : String(abono.postergacionId),
    };
  }

  // QUÉ HACE: arma el shape `Deferral` de una postergación.
  private formaPostergacion(
    postergacion: Record<string, any>,
    clientId: string,
  ): PostergacionForma {
    return {
      id: String(postergacion.id),
      clientId,
      period: etiquetaPeriodo(postergacion.anio, postergacion.mes),
      concept: postergacion.concepto,
      amount: Number(postergacion.monto),
      due: String(postergacion.vencimiento),
      note: postergacion.nota ?? '',
    };
  }

  private parseBoolean(raw: unknown, campo: string, defecto: boolean): boolean {
    if (raw === undefined || raw === null) return defecto;
    if (typeof raw !== 'boolean') {
      throw new BadRequestException(`El campo "${campo}" debe ser booleano.`);
    }
    return raw;
  }

  private parseTexto(raw: unknown, campo: string, max: number): string {
    if (raw === undefined || raw === null) return '';
    if (typeof raw !== 'string' || raw.length > max) {
      throw new BadRequestException(`El campo "${campo}" admite hasta ${max} caracteres.`);
    }
    return raw;
  }

  // QUÉ HACE: valida los metadatos opcionales del abono. Las cadenas
  //   vacías del formulario (cuentas en efectivo) se normalizan a null.
  private parseMetadatosAbono(raw: RegistrarAbonoDto): {
    transferId: string | null;
    metodo: string | null;
    cuentaOrigen: string | null;
    cuentaDestino: string | null;
    destino: string | null;
    postergacionId: bigint | null;
  } {
    const texto = (v: unknown, campo: string, max: number): string | null => {
      if (v === undefined || v === null || v === '') return null;
      if (typeof v !== 'string' || v.length > max) {
        throw new BadRequestException(`El campo "${campo}" admite hasta ${max} caracteres.`);
      }
      return v;
    };
    let destino: string | null = null;
    if (raw.destination !== undefined && raw.destination !== null && raw.destination !== '') {
      if (typeof raw.destination !== 'string' || !(DESTINOS as readonly string[]).includes(raw.destination)) {
        throw new BadRequestException('Destino de pago inválido.');
      }
      destino = raw.destination;
    }
    let postergacionId: bigint | null = null;
    if (raw.deferredId !== undefined && raw.deferredId !== null && raw.deferredId !== '') {
      postergacionId = parseId(raw.deferredId, 'deferredId');
    }
    return {
      transferId: texto(raw.transferId, 'transferId', TRANSFER_ID_MAX),
      metodo: texto(raw.method, 'method', METODO_MAX),
      cuentaOrigen: texto(raw.originAccount, 'originAccount', CUENTA_MAX),
      cuentaDestino: texto(raw.receivingAccount, 'receivingAccount', CUENTA_MAX),
      destino,
      postergacionId,
    };
  }

  private parseConcepto(raw: unknown): Concepto {
    if (typeof raw !== 'string' || !(CONCEPTOS as readonly string[]).includes(raw)) {
      throw new BadRequestException(
        `Concepto desconocido: "${String(raw)}". Usa el catálogo de la vista Obligaciones.`,
      );
    }
    return raw as Concepto;
  }

  private parseMontoPositivo(raw: unknown): number {
    if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw <= 0) {
      throw new BadRequestException('El abono debe ser un monto entero mayor que cero.');
    }
    if (raw > MONTO_MAX) {
      throw new BadRequestException('Los montos deben ser pesos enteros entre 0 y 999.999.999.');
    }
    return raw;
  }

  // QUÉ HACE: valida `Month.amounts` completo — los 9 conceptos del catálogo,
  //   enteros entre 0 y 999.999.999 (espejo de `saveMonth`, ficha/model.ts).
  private validarAmounts(raw: unknown): Record<Concepto, number> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('El campo "amounts" debe traer los montos por concepto.');
    }
    const registro = raw as Record<string, unknown>;
    const claves = Object.keys(registro);
    const esperados = new Set<string>(CONCEPTOS);
    for (const clave of claves) {
      if (!esperados.has(clave)) {
        throw new BadRequestException(`Concepto desconocido en "amounts": "${clave}".`);
      }
    }
    const amounts = {} as Record<Concepto, number>;
    for (const c of CONCEPTOS) {
      const valor = registro[c];
      if (typeof valor !== 'number' || !Number.isSafeInteger(valor)
        || valor < 0 || valor > MONTO_MAX) {
        throw new BadRequestException('Los montos deben ser pesos enteros entre 0 y 999.999.999.');
      }
      amounts[c] = valor;
    }
    return amounts;
  }

  // QUÉ HACE: valida `Month.steps` (≤20, texto no vacío ≤180 — espejo de
  //   `saveMonth`). El `id` local que mande el frontend se ignora: el id de
  //   renglón lo genera la BD (autoincrement).
  private validarSteps(raw: unknown): { text: string; done: boolean }[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) {
      throw new BadRequestException('El campo "steps" debe ser una lista de pasos.');
    }
    if (raw.length > PASOS_MAX) {
      throw new BadRequestException(`Revisa los pasos y el motivo del seguimiento: máximo ${PASOS_MAX}.`);
    }
    return raw.map((paso) => {
      if (!paso || typeof paso !== 'object') {
        throw new BadRequestException('Revisa los pasos y el motivo del seguimiento.');
      }
      const { text, done } = paso as { text?: unknown; done?: unknown };
      if (typeof text !== 'string' || !text.trim() || text.length > PASO_TEXTO_MAX
        || typeof done !== 'boolean') {
        throw new BadRequestException('Revisa los pasos y el motivo del seguimiento.');
      }
      return { text, done };
    });
  }
}
