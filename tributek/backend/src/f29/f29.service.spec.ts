import { describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { F29Service } from './f29.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PeriodosService } from '../periodos/periodos.service.js';

type EstadoFake = {
  clientes: { id: bigint }[];
  periodos: Record<string, any>[];
  proyecciones: Record<string, any>[];
  movimientos: Record<string, any>[];
};

const MANUAL_CERO = {
  voucherNet: 0,
  importation: 0,
  previousCredit: 0,
  retained: 0,
  singleTax: 0,
  loanSalary: 0,
  loanFees: 0,
  withholding: 0,
  contributions: 0,
  fees: 0,
};

const FILA_VENTA = {
  code: 33,
  rut: '76123456-7',
  name: 'Cliente Uno',
  folio: 'F-1',
  date: '15/03/2026',
  exempt: 0,
  net: 100,
  iva: 19,
  total: 119,
};

// QUÉ HACE: doble de prueba del ORM con el subconjunto que usa F29Service
//   (`where` encadenable + `orderBy` + `all`/`first` + `delete` + `create`, más
//   `db.transaction`), con borrado en cascada de movimientos al borrar la
//   proyección (espejo de `ON DELETE CASCADE`). EVITAR: reutilizarlo fuera de
//   este spec.
function crearServicio(estado: EstadoFake) {
  const coincide = (fila: any, cond: any) =>
    Object.entries(cond).every(([k, v]) => fila[k] === v);
  const filtrar = (filas: any[], acum: any[]) =>
    filas.filter((f) => acum.every((c) => coincide(f, c)));
  const cadena = (filas: any[], acum: any[] = []): any => ({
    where: (cond: any) => cadena(filas, [...acum, cond]),
    orderBy: () => cadena(filas, acum),
    all: async () => filtrar(filas, acum),
    first: async () => filtrar(filas, acum)[0] ?? null,
    delete: async () => {
      filtrar(filas, acum).forEach((f) => filas.splice(filas.indexOf(f), 1));
      return null;
    },
  });
  let seqProyeccion = 100;
  let seqMovimiento = 1000;
  const orm: any = {
    Cliente: {
      where: (cond: any) => ({
        first: async () => estado.clientes.find((c) => coincide(c, cond)) ?? null,
      }),
    },
    PeriodoCliente: {
      where: (cond: any) => cadena(estado.periodos, [cond]),
      orderBy: () => cadena(estado.periodos, []),
    },
    ProyeccionF29: {
      where: (cond: any) => {
        const q = cadena(estado.proyecciones, [cond]);
        const borrarBase = q.delete;
        q.delete = async () => {
          estado.proyecciones
            .filter((p) => coincide(p, cond))
            .forEach((p) => {
              estado.movimientos
                .filter((m) => m.proyeccionId === p.id)
                .forEach((m) => estado.movimientos.splice(estado.movimientos.indexOf(m), 1));
            });
          return borrarBase();
        };
        return q;
      },
      create: async (data: any) => {
        const row = { ...data, id: BigInt(seqProyeccion++) };
        estado.proyecciones.push(row);
        return row;
      },
    },
    F29Movimiento: {
      where: (cond: any) => cadena(estado.movimientos, [cond]),
      create: async (data: any) => {
        const row = { ...data, id: BigInt(seqMovimiento++) };
        estado.movimientos.push(row);
        return row;
      },
    },
  };
  const db = {
    orm: { public: orm },
    transaction: async (fn: (tx: any) => Promise<unknown>) => fn({ orm: { public: orm } }),
  };
  // `asegurar()` real vive en PeriodosService (probado en su spec): aquí basta
  // con devolver el período sembrado para el par cliente/año/mes del test.
  const periodos = { asegurar: async () => estado.periodos[0]?.id ?? 7n };
  return new F29Service({ db } as unknown as PrismaService, periodos as unknown as PeriodosService);
}

function estadoBase(): EstadoFake {
  return {
    clientes: [{ id: 1n }],
    periodos: [{ id: 7n, clienteId: 1n, anio: 2026, mes: 3 }],
    proyecciones: [],
    movimientos: [],
  };
}

function body(base: Record<string, any> = {}) {
  return {
    anio: 2026,
    mes: 3,
    manual: { ...MANUAL_CERO },
    ppmRate: 0,
    ppmOverride: null as number | null,
    reviewed: false,
    ventas: null,
    compras: null,
    ...base,
  };
}

describe('F29Service', () => {
  it('obtener devuelve null si el período aún no existe', async () => {
    const service = crearServicio({ clientes: [{ id: 1n }], periodos: [], proyecciones: [], movimientos: [] });
    await expect(service.obtener('1', '2026', '3')).resolves.toBeNull();
  });

  it('obtener rechaza un cliente inexistente', async () => {
    const service = crearServicio(estadoBase());
    await expect(service.obtener('9', '2026', '3')).rejects.toThrow('Cliente no encontrado');
    await expect(service.obtener('abc', '2026', '3')).rejects.toThrow('clienteId inválido');
  });

  it('guardar rechaza cuerpos inválidos antes de tocar la base', async () => {
    const service = crearServicio(estadoBase());
    await expect(service.guardar('1', body({ manual: null }), '1')).rejects.toThrow('manual');
    await expect(
      service.guardar('1', body({ manual: { ...MANUAL_CERO, otro: 1 } }), '1'),
    ).rejects.toThrow('desconocida');
    await expect(service.guardar('1', body({ ppmRate: 101 }), '1')).rejects.toThrow('ppmRate');
    await expect(service.guardar('1', body({ reviewed: 'si' } as any), '1')).rejects.toThrow('reviewed');
    await expect(service.guardar('1', body({ ventas: { rows: 'x' } } as any), '1')).rejects.toThrow('rows');
  });

  it('obtener devuelve la proyección en el shape del PUT', async () => {
    const estado = estadoBase();
    estado.proyecciones.push({
      id: 50n,
      periodoId: 7n,
      version: 2,
      estado: 'Borrador',
      generadoEn: null,
      netoVoucher: '10.00',
      ivaImportacion: '0.00',
      remanenteAnterior: '5.00',
      retenciones: '0.00',
      impuestoUnico: '0.00',
      prestamoRemuneraciones: '0.00',
      prestamoHonorarios: '0.00',
      retencionHonorarios: '0.00',
      cotizaciones: '0.00',
      honorarios: '0.00',
      ppmTasa: '0.500',
      ppmMontoManual: null,
      ventasFuente: 'ventas.csv',
      comprasFuente: null,
    });
    estado.movimientos.push({
      id: 60n,
      proyeccionId: 50n,
      tipo: 'venta',
      orden: 1,
      codigoDocumento: 33,
      rut: '76123456-7',
      folio: 'F-1',
      nombre: 'Cliente Uno',
      fecha: '15/03/2026',
      exento: '0.00',
      neto: '100.00',
      iva: '19.00',
      total: '119.00',
    });
    const result = await crearServicio(estado).obtener('1', '2026', '3');
    expect(result?.version).toBe(2);
    expect(result?.manual.previousCredit).toBe(5);
    expect(result?.manual.voucherNet).toBe(10);
    expect(result?.ppmRate).toBe(0.5);
    expect(result?.ppmOverride).toBeNull();
    expect(result?.ventas?.rows).toHaveLength(1);
    expect(result?.ventas?.rows[0]?.folio).toBe('F-1');
    expect(result?.compras).toBeNull();
  });

  it('guardar valida el detalle RCV', async () => {
    const service = crearServicio(estadoBase());
    const conFila = (fila: any, tipo: 'ventas' | 'compras' = 'ventas') =>
      body({ [tipo]: { name: 'rcv.csv', rows: [fila] } });
    await expect(
      service.guardar('1', conFila({ ...FILA_VENTA, code: 39 }, 'compras'), '1'),
    ).rejects.toThrow('no contemplado');
    await expect(
      service.guardar('1', body({ ventas: { name: 'rcv.csv', rows: [FILA_VENTA, FILA_VENTA] } }), '1'),
    ).rejects.toThrow('duplicado');
    await expect(
      service.guardar('1', conFila({ ...FILA_VENTA, date: '2026-03-15' }), '1'),
    ).rejects.toThrow('Fecha inválida');
    await expect(
      service.guardar('1', conFila({ ...FILA_VENTA, code: 61 }), '1'),
    ).rejects.toThrow('nota de crédito');
  });

  it('guardar crea la proyección con los agregados y la reemplaza en el segundo PUT', async () => {
    const estado = estadoBase();
    const service = crearServicio(estado);
    const primero = await service.guardar(
      '1',
      body({ ventas: { name: 'ventas.csv', rows: [FILA_VENTA] } }),
      '1',
    );
    expect(primero?.estado).toBe('Borrador');
    expect(primero?.version).toBe(1);
    expect(primero?.ventas?.rows).toHaveLength(1);
    // Agregados con las fórmulas de `calculate()` (f29/model.ts:191-199):
    // débito 19, crédito 0, IVA pagable 19, PPM 0 (tasa 0), total 19.
    const guardada = estado.proyecciones[0];
    expect(guardada.ivaDebito).toBe('19.00');
    expect(guardada.ivaCredito).toBe('0.00');
    expect(guardada.impuestoEstimado).toBe('19.00');
    expect(guardada.totalEstimado).toBe('19.00');

    const segundo = await service.guardar(
      '1',
      body({
        reviewed: true,
        ventas: { name: 'ventas.csv', rows: [FILA_VENTA] },
        compras: {
          name: 'nc.csv',
          rows: [{ ...FILA_VENTA, code: 61, folio: 'NC-1', net: -100, iva: -19, total: -119 }],
        },
      }),
      '1',
    );
    expect(segundo?.estado).toBe('Revisado');
    expect(segundo?.version).toBe(2);
    // Reemplazo total: 1 proyección y 2 movimientos (no se duplican).
    expect(estado.proyecciones).toHaveLength(1);
    expect(estado.movimientos).toHaveLength(2);
  });


  it('guardar rechaza un cliente inexistente', async () => {
    const service = crearServicio({ clientes: [], periodos: [], proyecciones: [], movimientos: [] });
    await expect(service.guardar('9', body(), '1')).rejects.toThrow('Cliente no encontrado');
  });
});
