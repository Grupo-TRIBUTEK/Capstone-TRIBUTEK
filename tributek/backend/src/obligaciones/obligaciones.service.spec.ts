/** Pruebas de obligaciones. Cada test/it nombra el comportamiento esperado; los datos y dependencias de ensayo permiten comprobarlo de forma repetible. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { ObligacionesService } from './obligaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PeriodosService } from '../periodos/periodos.service.js';

type EstadoFake = {
  clientes: { id: bigint }[];
  periodos: Record<string, any>[];
  meses: Record<string, any>[];
  montos: Record<string, any>[];
  pasos: Record<string, any>[];
  abonos: Record<string, any>[];
  postergaciones: Record<string, any>[];
};

const crearEstado = (): EstadoFake => ({
  clientes: [{ id: 1n }],
  periodos: [],
  meses: [],
  montos: [],
  pasos: [],
  abonos: [],
  postergaciones: [],
});

const amountsCero = () =>
  Object.fromEntries(
    [
      'Honorarios',
      'Impuestos',
      'Formalización',
      'Retención boletas',
      'Cotizaciones',
      'Postergación',
      'Convenio',
      'Cobranza',
      'Otro',
    ].map((c) => [c, 0]),
  );

// QUÉ HACE: doble de prueba del ORM con el subconjunto que usa
//   ObligacionesService — `where` por objeto Y por callback (`in`/`eq`, que el
//   ORM real emite como SQL), `orderBy` + `all`/`first` + `update` + `delete`
//   + `create`, más `db.transaction`. EVITAR: reutilizarlo fuera de este spec.
function crearServicio(estado: EstadoFake) {
  const coincide = (fila: any, cond: any): boolean => {
    if (typeof cond !== 'function') {
      return Object.entries(cond).every(([k, v]) => fila[k] === v);
    }
    const columna = new Proxy({} as any, {
      get: (_t, prop) => {
        if (typeof prop !== 'string') return undefined;
        return {
          in: (vals: readonly unknown[]) => ({ op: 'in', col: prop, vals }),
          eq: (v: unknown) => ({ op: 'eq', col: prop, v }), neq: (v: unknown) => ({ op: 'neq', col: prop, v }),
        };
      },
    });
    const expr = cond(columna);
    if (expr?.op === 'in') return expr.vals.includes(fila[expr.col]);
    if (expr?.op === 'neq') return fila[expr.col] !== expr.v;
    if (expr?.op === 'eq') return fila[expr.col] === expr.v;
    return false;
  };
  const filtrar = (filas: any[], acum: any[]) =>
    filas.filter((f) => acum.every((c) => coincide(f, c)));
  // Ordena por los campos capturados en `orderBy` (todos asc en
  // este doble — el service solo usa `.asc()`).
  const ordenar = (filas: any[], orden: string[]) => {
    if (!orden.length) return filas;
    return [...filas].sort((a, b) => {
      for (const campo of orden) {
        if (a[campo] < b[campo]) return -1;
        if (a[campo] > b[campo]) return 1;
      }
      return 0;
    });
  };
  const cadena = (filas: any[], acum: any[] = [], orden: string[] = []): any => ({
    where: (cond: any) => cadena(filas, [...acum, cond], orden),
    orderBy: (fn: any) => {
      const campo = new Proxy({} as any, {
        get: (_t, prop) => {
          if (typeof prop !== 'string') return undefined;
          return { asc: () => prop, desc: () => prop };
        },
      });
      const capturado = fn?.(campo);
      return cadena(filas, acum, capturado ? [...orden, capturado] : orden);
    },
    all: async () => ordenar(filtrar(filas, acum), orden),
    first: async () => ordenar(filtrar(filas, acum), orden)[0] ?? null,
    update: async (patch: any) => {
      const hallados = filtrar(filas, acum);
      hallados.forEach((f) => Object.assign(f, patch));
      return hallados[0] ?? null;
    },
    delete: async () => {
      filtrar(filas, acum).forEach((f) => filas.splice(filas.indexOf(f), 1));
      return null;
    },
  });
  const tabla = (filas: any[], seq: { n: number }) => ({
    where: (cond: any) => cadena(filas, [cond]),
    orderBy: () => cadena(filas, []),
    create: async (data: any) => {
      const row = { ...data, id: BigInt(seq.n++) };
      filas.push(row);
      return row;
    },
  });
  const orm: any = {
    Cliente: {
      where: (cond: any) => ({
        first: async () => estado.clientes.find((c) => coincide(c, cond)) ?? null, all: async () => estado.clientes.filter(c => coincide(c, cond)),
      }),
    },
    Factura: tabla([], { n: 1 }), PeriodoCliente: tabla(estado.periodos, { n: 700 }),
    MesCliente: tabla(estado.meses, { n: 1 }),
    MontoConcepto: tabla(estado.montos, { n: 100 }),
    PasoMes: tabla(estado.pasos, { n: 500 }),
    AbonoMes: tabla(estado.abonos, { n: 1000 }),
    PostergacionMes: tabla(estado.postergaciones, { n: 2000 }),
  };
  const db = {
    orm: { public: orm },
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ orm: { public: orm } }),
  };
  const periodos = {
    obtenerIdsPorClientes: async (ids: bigint[]) => estado.periodos.filter(p => ids.includes(p.clienteId)).map(p => p.id),
    obtenerPorIds: async (ids: bigint[]) => new Map(estado.periodos.filter(p => ids.includes(p.id)).map(p => [p.id, p])),
    asegurarIds: async (anio: number, mes: number) => estado.periodos.find(p => p.anio === anio && p.mes === mes)?.id ?? null,
    asegurar: async (clienteId: bigint, anio: number, mes: number) => {
      const existente = estado.periodos.find(
        (p) => p.clienteId === clienteId && p.anio === anio && p.mes === mes,
      );
      if (existente) return existente.id;
      const id = BigInt(estado.periodos.length + 700);
      estado.periodos.push({
        id,
        clienteId,
        anio,
        mes,
        estadoContable: 'Abierto',
        fechaVencimiento: null,
        cerrado: false,
        creadoEn: null,
      });
      return id;
    },
  } as unknown as PeriodosService;
  return new ObligacionesService(
    { db } as unknown as PrismaService,
    periodos,
  );
}

describe('ObligacionesService', () => {
  it('lista meses y abonos en el shape de Data', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 700n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 1n, periodoId: 700n, enviado: true,
      seguimientoFecha: '2026-03-15', seguimientoNota: 'Llamar', seguimientoHecho: true,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 100n, mesId: 1n, concepto: 'Honorarios', monto: '1500.00' });
    estado.pasos.push({ id: 500n, mesId: 1n, orden: 1, texto: 'Firmar contrato', hecho: false });
    estado.abonos.push({
      id: 1000n, mesId: 1n, concepto: 'Honorarios', monto: '500.00',
      fecha: '2026-03-20', nota: 'Parcial', creadoEn: null,
    });

    const service = crearServicio(estado);
    const resultado = await service.listarMeses('1');
    expect(resultado.months).toHaveLength(1);
    expect(resultado.months[0]).toMatchObject({
      clientId: '1',
      period: '2026-03',
      sent: true,
      followDate: '2026-03-15',
      followNote: 'Llamar',
      followDone: true,
    });
    expect(resultado.months[0]?.amounts.Honorarios).toBe(1500);
    expect(resultado.months[0]?.amounts.Impuestos).toBe(0);
    expect(resultado.months[0]?.steps).toEqual([
      { id: '500', text: 'Firmar contrato', done: false },
    ]);
    expect(resultado.payments).toHaveLength(1);
    expect(resultado.payments[0]).toMatchObject({
      id: '1000',
      clientId: '1',
      period: '2026-03',
      concept: 'Honorarios',
      amount: 500,
      date: '2026-03-20',
      note: 'Parcial',
    });
  });

  it('el período sin mes guardado sale como borrador', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 701n, clienteId: 1n, anio: 2026, mes: 4,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    const service = crearServicio(estado);
    const resultado = await service.listarMeses('1');
    expect(resultado.months).toHaveLength(1);
    expect(resultado.months[0]).toMatchObject({ period: '2026-04', sent: false });
    expect(resultado.months[0]?.amounts).toEqual(amountsCero());
    expect(resultado.payments).toHaveLength(0);
  });

  it('rechaza clienteId inválido o desconocido', async () => {
    const service = crearServicio(crearEstado());
    await expect(service.listarMeses('abc')).rejects.toThrow('clienteId inválido');
    await expect(service.listarMeses('9')).rejects.toThrow('Cliente no encontrado');
  });

  it('guardarMes crea el mes con los 9 montos y sus pasos', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    const mes = await service.guardarMes('1', {
      anio: 2026,
      mes: 5,
      sent: true,
      amounts: { ...amountsCero(), Honorarios: 1000 },
      steps: [{ text: 'Enviar carta', done: false }],
      followDate: '2026-05-10',
      followNote: 'Primera gestión',
      followDone: false,
    });
    expect(estado.periodos).toHaveLength(1);
    expect(estado.meses).toHaveLength(1);
    expect(estado.montos).toHaveLength(9);
    expect(estado.montos.find((m) => m.concepto === 'Honorarios')?.monto).toBe('1000.00');
    expect(estado.pasos).toHaveLength(1);
    expect(estado.pasos[0]).toMatchObject({ orden: 1, texto: 'Enviar carta', hecho: false });
    expect(mes).toMatchObject({ period: '2026-05', sent: true, followDate: '2026-05-10' });
    expect(mes.amounts.Honorarios).toBe(1000);
  });

  it('guardarMes reemplaza montos y pasos sin tocar abonos', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 702n, clienteId: 1n, anio: 2026, mes: 6,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 2n, periodoId: 702n, enviado: false,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 101n, mesId: 2n, concepto: 'Honorarios', monto: '500.00' });
    estado.pasos.push({ id: 501n, mesId: 2n, orden: 1, texto: 'Paso viejo', hecho: true });
    estado.abonos.push({
      id: 1001n, mesId: 2n, concepto: 'Honorarios', monto: '100.00',
      fecha: '2026-06-10', nota: null, creadoEn: null,
    });

    const service = crearServicio(estado);
    await service.guardarMes('1', {
      anio: 2026,
      mes: 6,
      sent: true,
      amounts: { ...amountsCero(), Honorarios: 1000 },
      steps: [{ text: 'Paso nuevo', done: false }],
    });
    expect(estado.meses[0]?.enviado).toBe(true);
    expect(estado.montos).toHaveLength(9);
    expect(estado.montos.find((m) => m.concepto === 'Honorarios')?.monto).toBe('1000.00');
    expect(estado.pasos).toHaveLength(1);
    expect(estado.pasos[0]?.texto).toBe('Paso nuevo');
    expect(estado.abonos).toHaveLength(1);
    expect(estado.abonos[0]?.monto).toBe('100.00');
  });

  it('guardarMes valida montos enteros entre 0 y 999.999.999', async () => {
    const service = crearServicio(crearEstado());
    const base = { anio: 2026, mes: 7, amounts: amountsCero(), steps: [] };
    await expect(
      service.guardarMes('1', { ...base, amounts: undefined }),
    ).rejects.toThrow('amounts');
    await expect(
      service.guardarMes('1', {
        ...base,
        amounts: { ...amountsCero(), Honorarios: 1.5 },
      }),
    ).rejects.toThrow('pesos enteros');
    await expect(
      service.guardarMes('1', {
        ...base,
        amounts: { ...amountsCero(), Honorarios: -1 },
      }),
    ).rejects.toThrow('pesos enteros');
    const sinImpuestos = { ...amountsCero() } as Record<string, number>;
    delete sinImpuestos.Impuestos;
    await expect(
      service.guardarMes('1', { ...base, amounts: sinImpuestos }),
    ).rejects.toThrow('pesos enteros');
    await expect(
      service.guardarMes('1', {
        ...base,
        amounts: { ...amountsCero(), IVA: 100 },
      }),
    ).rejects.toThrow('Concepto desconocido en "amounts"');
  });

  it('guardarMes no permite reducir montos por debajo de abonos', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 703n, clienteId: 1n, anio: 2026, mes: 8,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 3n, periodoId: 703n, enviado: false,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.abonos.push({
      id: 1002n, mesId: 3n, concepto: 'Impuestos', monto: '200.00',
      fecha: '2026-08-01', nota: null, creadoEn: null,
    });
    const service = crearServicio(estado);
    await expect(
      service.guardarMes('1', {
        anio: 2026,
        mes: 8,
        amounts: { ...amountsCero(), Impuestos: 150 },
        steps: [],
      }),
    ).rejects.toThrow('No puedes reducir Impuestos por debajo de sus abonos y postergaciones.');
  });

  it('guardarMes valida seguimiento y pasos', async () => {
    const service = crearServicio(crearEstado());
    const base = { anio: 2026, mes: 9, amounts: amountsCero() };
    await expect(
      service.guardarMes('1', { ...base, followDone: true, followDate: '' }),
    ).rejects.toThrow('Indica la fecha del seguimiento');
    await expect(
      service.guardarMes('1', { ...base, followDate: '2026-02-30' }),
    ).rejects.toThrow('followDate inválida');
    await expect(
      service.guardarMes('1', { ...base, followNote: 'x'.repeat(501) }),
    ).rejects.toThrow('followNote');
    await expect(
      service.guardarMes('1', {
        ...base,
        steps: Array.from({ length: 21 }, (_, i) => ({ text: `Paso ${i}`, done: false })),
      }),
    ).rejects.toThrow('máximo 20');
    await expect(
      service.guardarMes('1', { ...base, steps: [{ text: '   ', done: false }] }),
    ).rejects.toThrow('Revisa los pasos');
    await expect(
      service.guardarMes('1', { ...base, sent: 'si' as unknown as boolean }),
    ).rejects.toThrow('sent');
  });

  it('registrarAbono crea el abono dentro del saldo', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 704n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 4n, periodoId: 704n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 102n, mesId: 4n, concepto: 'Honorarios', monto: '1000.00' });

    const service = crearServicio(estado);
    const abono = await service.registrarAbono('1', {
      anio: 2026,
      mes: 3,
      concept: 'Honorarios',
      amount: 400,
      date: '2020-01-01',
      note: 'Transferencia',
    });
    expect(estado.abonos).toHaveLength(1);
    expect(estado.abonos[0]?.monto).toBe('400.00');
    expect(abono).toMatchObject({
      clientId: '1',
      period: '2026-03',
      concept: 'Honorarios',
      amount: 400,
      date: '2020-01-01',
      note: 'Transferencia',
    });
    expect(abono.id).toBeTruthy();
  });

  it('registrarAbono rechaza concepto, monto o fecha inválidos', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 705n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 5n, periodoId: 705n, enviado: false,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 103n, mesId: 5n, concepto: 'Honorarios', monto: '1000.00' });

    const service = crearServicio(estado);
    const base = { anio: 2026, mes: 3, amount: 100, date: '2020-01-01' };
    await expect(
      service.registrarAbono('1', { ...base, concept: 'Iva' }),
    ).rejects.toThrow('Concepto desconocido');
    await expect(
      service.registrarAbono('1', { ...base, concept: 'Honorarios', amount: 0 }),
    ).rejects.toThrow('monto entero mayor que cero');
    await expect(
      service.registrarAbono('1', { ...base, concept: 'Honorarios', amount: 1.5 }),
    ).rejects.toThrow('monto entero mayor que cero');
    await expect(
      service.registrarAbono('1', { ...base, concept: 'Honorarios', date: '2026-13-40' }),
    ).rejects.toThrow('date inválida');
    await expect(
      service.registrarAbono('1', { ...base, concept: 'Honorarios', date: '2999-01-01' }),
    ).rejects.toThrow('no futura');
    expect(estado.abonos).toHaveLength(0);
  });

  it('registrarAbono exige mes guardado y saldo suficiente', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Honorarios', amount: 100, date: '2020-01-01',
      }),
    ).rejects.toThrow('Guarda primero los conceptos de ese período.');

    estado.periodos.push({
      id: 706n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 6n, periodoId: 706n, enviado: false,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 104n, mesId: 6n, concepto: 'Honorarios', monto: '1000.00' });
    estado.abonos.push({
      id: 1003n, mesId: 6n, concepto: 'Honorarios', monto: '600.00',
      fecha: '2020-01-01', nota: null, creadoEn: null, postergacionId: null,
    });
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Honorarios', amount: 500, date: '2020-01-01',
      }),
    ).rejects.toThrow('El abono supera el saldo del concepto.');
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Honorarios', amount: 400, date: '2020-01-01',
      }),
    ).resolves.toMatchObject({ amount: 400 });
  });

  it('eliminarAbono borra y falla si no existe', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 707n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 7n, periodoId: 707n, enviado: false,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.abonos.push({
      id: 1004n, mesId: 7n, concepto: 'Impuestos', monto: '300.00',
      fecha: '2020-01-01', nota: null, creadoEn: null,
    });
    const service = crearServicio(estado);

    await expect(service.eliminarAbono('abc')).rejects.toThrow('abonoId inválido');
    await expect(service.eliminarAbono('9999')).rejects.toThrow('Abono no encontrado');
    const borrado = await service.eliminarAbono('1004');
    expect(borrado).toMatchObject({ id: '1004', concept: 'Impuestos', deleted: true });
    expect(estado.abonos).toHaveLength(0);
  });

  it('listarMeses devuelve las postergaciones del cliente', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 708n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.postergaciones.push({
      id: 2000n, clienteId: 1n, anio: 2026, mes: 3,
      concepto: 'Impuestos', monto: '250.00',
      vencimiento: '2026-04-20', nota: 'Acuerdo', creadoEn: null,
    });
    const service = crearServicio(estado);
    const resultado = await service.listarMeses('1');
    expect(resultado.deferrals).toHaveLength(1);
    expect(resultado.deferrals[0]).toMatchObject({
      id: '2000',
      clientId: '1',
      period: '2026-03',
      concept: 'Impuestos',
      amount: 250,
      due: '2026-04-20',
      note: 'Acuerdo',
    });
  });

  it('registrarAbono guarda los metadatos de la transferencia', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 709n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 8n, periodoId: 709n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 105n, mesId: 8n, concepto: 'Honorarios', monto: '1000.00' });

    const service = crearServicio(estado);
    const abono = await service.registrarAbono('1', {
      anio: 2026,
      mes: 3,
      concept: 'Honorarios',
      amount: 200,
      date: '2020-01-01',
      note: 'Transferencia',
      transferId: 'uuid-1234',
      method: 'Transferencia',
      originAccount: 'Banco X, titular, cuenta 1',
      receivingAccount: 'Banco Y, cuenta 2',
      destination: 'tributek',
    });
    expect(estado.abonos[0]).toMatchObject({
      transferId: 'uuid-1234',
      metodo: 'Transferencia',
      cuentaOrigen: 'Banco X, titular, cuenta 1',
      cuentaDestino: 'Banco Y, cuenta 2',
      destino: 'tributek',
      postergacionId: null,
    });
    expect(abono).toMatchObject({
      transferId: 'uuid-1234',
      method: 'Transferencia',
      originAccount: 'Banco X, titular, cuenta 1',
      receivingAccount: 'Banco Y, cuenta 2',
      destination: 'tributek',
      deferredId: null,
    });
  });

  it('registrarAbono normaliza las cadenas vacías a null', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 710n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 9n, periodoId: 710n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 106n, mesId: 9n, concepto: 'Honorarios', monto: '1000.00' });

    const service = crearServicio(estado);
    await service.registrarAbono('1', {
      anio: 2026, mes: 3, concept: 'Honorarios', amount: 100,
      date: '2020-01-01', method: 'Efectivo',
      originAccount: '', receivingAccount: '', destination: '',
    });
    expect(estado.abonos[0]).toMatchObject({
      metodo: 'Efectivo',
      cuentaOrigen: null,
      cuentaDestino: null,
      destino: null,
    });
  });

  it('registrarAbono rechaza destino inválido', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 711n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 10n, periodoId: 711n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 107n, mesId: 10n, concepto: 'Honorarios', monto: '1000.00' });
    const service = crearServicio(estado);
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Honorarios', amount: 100,
        date: '2020-01-01', destination: 'otro',
      }),
    ).rejects.toThrow('Destino de pago inválido');
  });

  it('registrarAbono contra postergación valida correspondencia y saldo', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 712n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 11n, periodoId: 712n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 108n, mesId: 11n, concepto: 'Impuestos', monto: '1000.00' });
    estado.postergaciones.push({
      id: 2001n, clienteId: 1n, anio: 2026, mes: 3,
      concepto: 'Impuestos', monto: '400.00',
      vencimiento: '2026-04-20', nota: null, creadoEn: null,
    });

    const service = crearServicio(estado);
    // Concepto distinto al de la postergación.
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Honorarios', amount: 100,
        date: '2020-01-01', deferredId: '2001',
      }),
    ).rejects.toThrow('El abono no corresponde a la postergación.');
    // Supera el saldo de la postergación.
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Impuestos', amount: 500,
        date: '2020-01-01', deferredId: '2001',
      }),
    ).rejects.toThrow('El abono supera el saldo de la postergación');
    // Dentro del saldo: queda registrado contra ella.
    const abono = await service.registrarAbono('1', {
      anio: 2026, mes: 3, concept: 'Impuestos', amount: 250,
      date: '2020-01-01', deferredId: '2001',
    });
    expect(estado.abonos[0]).toMatchObject({
      monto: '250.00', postergacionId: 2001n,
    });
    expect(abono.deferredId).toBe('2001');
  });

  it('registrarAbono contra postergación inexistente falla', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 713n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 12n, periodoId: 713n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 109n, mesId: 12n, concepto: 'Impuestos', monto: '1000.00' });
    const service = crearServicio(estado);
    await expect(
      service.registrarAbono('1', {
        anio: 2026, mes: 3, concept: 'Impuestos', amount: 100,
        date: '2020-01-01', deferredId: '9999',
      }),
    ).rejects.toThrow('Postergación no encontrada');
  });

  it('crearPostergacion exige mes guardado, vencimiento y saldo', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    // Sin mes guardado.
    await expect(
      service.crearPostergacion('1', {
        anio: 2026, mes: 3, concept: 'Impuestos', amount: 100, due: '2026-04-01',
      }),
    ).rejects.toThrow('Guarda primero los conceptos de ese período.');

    estado.periodos.push({
      id: 714n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 13n, periodoId: 714n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 110n, mesId: 13n, concepto: 'Impuestos', monto: '500.00' });
    // Vencimiento anterior al período.
    await expect(
      service.crearPostergacion('1', {
        anio: 2026, mes: 3, concept: 'Impuestos', amount: 100, due: '2026-02-28',
      }),
    ).rejects.toThrow('no puede ser anterior al período');
    // Concepto inválido.
    await expect(
      service.crearPostergacion('1', {
        anio: 2026, mes: 3, concept: 'Iva', amount: 100, due: '2026-04-01',
      }),
    ).rejects.toThrow('Concepto desconocido');
    // Monto superior al saldo.
    await expect(
      service.crearPostergacion('1', {
        anio: 2026, mes: 3, concept: 'Impuestos', amount: 600, due: '2026-04-01',
      }),
    ).rejects.toThrow('El monto supera el saldo disponible');
    // Válida.
    const postergacion = await service.crearPostergacion('1', {
      anio: 2026, mes: 3, concept: 'Impuestos', amount: 200,
      due: '2026-04-20', note: 'Acuerdo de pago',
    });
    expect(estado.postergaciones).toHaveLength(1);
    expect(estado.postergaciones[0]).toMatchObject({
      clienteId: 1n, anio: 2026, mes: 3, concepto: 'Impuestos',
      monto: '200.00', nota: 'Acuerdo de pago',
    });
    expect(String(estado.postergaciones[0]?.vencimiento)).toBe('2026-04-20');
    expect(postergacion).toMatchObject({
      clientId: '1', period: '2026-03', concept: 'Impuestos',
      amount: 200, due: '2026-04-20', note: 'Acuerdo de pago',
    });
  });

  it('eliminarPostergacion rechaza si tiene abonos asociados', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 715n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.postergaciones.push({
      id: 2002n, clienteId: 1n, anio: 2026, mes: 3,
      concepto: 'Impuestos', monto: '300.00',
      vencimiento: '2026-04-20', nota: null, creadoEn: null,
    });
    estado.abonos.push({
      id: 1005n, mesId: 1n, concepto: 'Impuestos', monto: '100.00',
      fecha: '2020-01-01', nota: null, creadoEn: null, postergacionId: 2002n,
    });
    const service = crearServicio(estado);

    await expect(service.eliminarPostergacion('abc')).rejects.toThrow('postergacionId inválido');
    await expect(service.eliminarPostergacion('9999')).rejects.toThrow('Postergación no encontrada');
    await expect(service.eliminarPostergacion('2002')).rejects.toThrow(
      'Corrige primero los abonos asociados a esta postergación.',
    );
    expect(estado.postergaciones).toHaveLength(1);

    estado.abonos.length = 0;
    const borrado = await service.eliminarPostergacion('2002');
    expect(borrado).toMatchObject({ id: '2002', deleted: true });
    expect(estado.postergaciones).toHaveLength(0);
  });

  it('listarPostergaciones ordena por período', async () => {
    const estado = crearEstado();
    estado.postergaciones.push(
      {
        id: 2003n, clienteId: 1n, anio: 2026, mes: 5,
        concepto: 'Honorarios', monto: '100.00',
        vencimiento: '2026-06-20', nota: null, creadoEn: null,
      },
      {
        id: 2004n, clienteId: 1n, anio: 2026, mes: 3,
        concepto: 'Impuestos', monto: '200.00',
        vencimiento: '2026-04-20', nota: null, creadoEn: null,
      },
    );
    const service = crearServicio(estado);
    const lista = await service.listarPostergaciones('1');
    expect(lista.map((p) => p.period)).toEqual(['2026-03', '2026-05']);
  });

  it('actualizarPostergacion edita monto, vencimiento y nota', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 716n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 14n, periodoId: 716n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 111n, mesId: 14n, concepto: 'Impuestos', monto: '500.00' });
    estado.postergaciones.push({
      id: 2005n, clienteId: 1n, anio: 2026, mes: 3,
      concepto: 'Impuestos', monto: '200.00',
      vencimiento: '2026-04-20', nota: 'Original', creadoEn: null,
    });
    const service = crearServicio(estado);

    const actualizada = await service.actualizarPostergacion('2005', {
      anio: 2026, mes: 3, concept: 'Impuestos',
      amount: 300, due: '2026-05-01', note: 'Renegociada',
    });
    expect(estado.postergaciones[0]).toMatchObject({
      monto: '300.00', nota: 'Renegociada',
    });
    expect(String(estado.postergaciones[0]?.vencimiento)).toBe('2026-05-01');
    expect(actualizada).toMatchObject({
      id: '2005', amount: 300, due: '2026-05-01', note: 'Renegociada',
    });
  });

  it('actualizarPostergacion valida saldo y abonos', async () => {
    const estado = crearEstado();
    estado.periodos.push({
      id: 717n, clienteId: 1n, anio: 2026, mes: 3,
      estadoContable: 'Abierto', fechaVencimiento: null, cerrado: false, creadoEn: null,
    });
    estado.meses.push({
      id: 15n, periodoId: 717n, enviado: true,
      seguimientoFecha: null, seguimientoNota: null, seguimientoHecho: false,
      creadoEn: null, actualizadoEn: null,
    });
    estado.montos.push({ id: 112n, mesId: 15n, concepto: 'Impuestos', monto: '500.00' });
    estado.postergaciones.push({
      id: 2006n, clienteId: 1n, anio: 2026, mes: 3,
      concepto: 'Impuestos', monto: '200.00',
      vencimiento: '2026-04-20', nota: null, creadoEn: null,
    });
    estado.abonos.push({
      id: 1006n, mesId: 15n, concepto: 'Impuestos', monto: '100.00',
      fecha: '2020-01-01', nota: null, creadoEn: null, postergacionId: 2006n,
    });
    const service = crearServicio(estado);
    const base = { anio: 2026, mes: 3, concept: 'Impuestos', due: '2026-05-01' };

    // Reduce por debajo de lo abonado contra ella.
    await expect(
      service.actualizarPostergacion('2006', { ...base, amount: 50 }),
    ).rejects.toThrow('No puedes reducir la postergación por debajo de sus abonos.');
    // Supera el saldo disponible (500 - 0 regulares - 200 postergado = 300, +200 liberados = 500).
    await expect(
      service.actualizarPostergacion('2006', { ...base, amount: 501 }),
    ).rejects.toThrow('El monto supera el saldo disponible');
    // Vencimiento anterior al período.
    await expect(
      service.actualizarPostergacion('2006', { ...base, amount: 300, due: '2026-02-28' }),
    ).rejects.toThrow('no puede ser anterior al período');
    // No existe.
    await expect(service.actualizarPostergacion('9999', { ...base, amount: 300 }))
      .rejects.toThrow('Postergación no encontrada');
    // Válida: sube a 400 (300 de saldo + 100... en realidad 300+200=500 de límite).
    await expect(
      service.actualizarPostergacion('2006', { ...base, amount: 400 }),
    ).resolves.toMatchObject({ amount: 400 });
  });
});




it('conserva los montos de dos clientes al consultar el mismo mes', async () => {
  const estado = crearEstado();
  estado.clientes.push({id: 2n});
  const service = crearServicio(estado);
  for (const [id, amount] of [['1', 15000], ['2', 27000]] as const) {
    await service.guardarMes(id, {anio: 2026, mes: 10, amounts: {...amountsCero(), Honorarios: amount}});
  }
  await service.guardarMes('2', {anio: 2026, mes: 9, amounts: {...amountsCero(), Honorarios: 9000}});
  const result = await service.listarTodo('2026-10');
  expect(result.months.map(m => [m.clientId, m.amounts.Honorarios])).toEqual([['1',15000],['2',27000]]);
  expect((await service.listarTodo('2026-11')).months).toEqual([]);
});