import { describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { PeriodosService } from './periodos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Periodo = {
  id: bigint;
  clienteId: bigint;
  anio: number;
  mes: number;
  estadoContable: string;
  fechaVencimiento: unknown;
  cerrado: boolean;
  creadoEn: unknown;
};

// QUÉ HACE: doble de prueba del ORM con el subconjunto que usa PeriodosService
//   (`where` encadenable + `orderBy` + `all`/`first` + `update` + `create`, más
//   `db.transaction`). EVITAR: reutilizarlo fuera de este spec — cada spec
//   define el suyo según el service que prueba.
function crearServicio(periodos: Periodo[], clientes: { id: bigint }[]) {
  const coincide = (fila: Record<string, unknown>, cond: Record<string, unknown>) =>
    Object.entries(cond).every(([k, v]) => fila[k] === v);
  const filtrar = (acum: Record<string, unknown>[]) =>
    periodos.filter((p) => acum.every((c) => coincide(p as unknown as Record<string, unknown>, c)));
  const cadena = (acum: Record<string, unknown>[] = []): any => ({
    where: (cond: Record<string, unknown>) => cadena([...acum, cond]),
    orderBy: () => cadena(acum),
    all: async () => filtrar(acum),
    first: async () => filtrar(acum)[0] ?? null,
    update: async (patch: Record<string, unknown>) => {
      const hallados = filtrar(acum);
      hallados.forEach((p) => Object.assign(p, patch));
      return hallados[0] ?? null;
    },
  });
  const orm = {
    Cliente: {
      where: (cond: Record<string, unknown>) => ({
        first: async () =>
          clientes.find((c) => coincide(c as unknown as Record<string, unknown>, cond)) ?? null,
      }),
    },
    PeriodoCliente: {
      where: (cond: Record<string, unknown>) => cadena([cond]),
      orderBy: () => cadena([]),
      create: async (data: Omit<Periodo, 'id'>) => {
        const fila = { ...data, id: BigInt(periodos.length + 1) } as Periodo;
        periodos.push(fila);
        return fila;
      },
    },
  };
  const db = {
    orm: { public: orm },
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ orm: { public: orm } }),
  };
  return new PeriodosService({ db } as unknown as PrismaService);
}

const PERIODO: Periodo = {
  id: 7n,
  clienteId: 1n,
  anio: 2026,
  mes: 3,
  estadoContable: 'Abierto',
  fechaVencimiento: null,
  cerrado: false,
  creadoEn: null,
};

describe('PeriodosService', () => {
  it('lista los períodos y filtra por cliente', async () => {
    const service = crearServicio(
      [{ ...PERIODO }, { ...PERIODO, id: 8n, clienteId: 2n, mes: 4 }],
      [{ id: 1n }, { id: 2n }],
    );
    await expect(service.listar({})).resolves.toHaveLength(2);
    await expect(service.listar({ clienteId: '1' })).resolves.toHaveLength(1);
  });

  it('rechaza filtros con formato inválido', async () => {
    const service = crearServicio([], []);
    await expect(service.listar({ mes: '13' })).rejects.toThrow('Mes inválido');
    await expect(service.listar({ clienteId: 'abc' })).rejects.toThrow('clienteId inválido');
  });

  it('crea el período si no existe y lo actualiza sin duplicar si existe', async () => {
    const filas: Periodo[] = [];
    const service = crearServicio(filas, [{ id: 1n }]);
    const creado = await service.guardar({ clienteId: '1', anio: 2026, mes: 5 });
    expect(creado?.cerrado).toBe(false);
    expect(filas).toHaveLength(1);
    await service.guardar({ clienteId: '1', anio: 2026, mes: 5, estadoContable: 'Enviado', cerrado: true });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.estadoContable).toBe('Enviado');
    expect(filas[0]?.cerrado).toBe(true);
  });

  it('rechaza guardar para un cliente inexistente o datos inválidos', async () => {
    const service = crearServicio([], []);
    await expect(service.guardar({ clienteId: '9', anio: 2026, mes: 5 })).rejects.toThrow(
      'Cliente no encontrado',
    );
    await expect(service.guardar({ clienteId: '1', anio: 1999, mes: 5 })).rejects.toThrow('Año inválido');
    await expect(
      service.guardar({ clienteId: '1', anio: 2026, mes: 5, cerrado: 'si' as unknown as boolean }),
    ).rejects.toThrow('cerrado');
    await expect(
      service.guardar({ clienteId: '1', anio: 2026, mes: 5, fechaVencimiento: '05-2026' }),
    ).rejects.toThrow('fechaVencimiento');
  });

  it('asegurar devuelve el id existente o crea la fila', async () => {
    const filas = [{ ...PERIODO }];
    const service = crearServicio(filas, [{ id: 1n }]);
    await expect(service.asegurar(1n, 2026, 3)).resolves.toBe(7n);
    const nuevo = await service.asegurar(1n, 2026, 4);
    expect(typeof nuevo).toBe('bigint');
    expect(filas).toHaveLength(2);
  });
});
