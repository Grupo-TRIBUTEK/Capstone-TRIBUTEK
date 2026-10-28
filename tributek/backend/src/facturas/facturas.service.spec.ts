/** Pruebas de facturas. Cada test/it nombra el comportamiento esperado; los datos y dependencias de ensayo permiten comprobarlo de forma repetible. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { FacturasService } from './facturas.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type EstadoFake = {
  clientes: { id: bigint }[];
  facturas: Record<string, any>[];
};

const crearEstado = (): EstadoFake => ({
  clientes: [{ id: 1n }],
  facturas: [],
});

// QUÉ HACE: doble de prueba del ORM con el subconjunto que usa
//   FacturasService — `where` + `orderBy` + `all`/`first` +
//   `create` + `delete`. EVITAR: reutilizarlo fuera de este spec.
function crearServicio(estado: EstadoFake) {
  const coincide = (fila: Record<string, unknown>, cond: Record<string, unknown>) =>
    Object.entries(cond).every(([k, v]) => fila[k] === v);
  const filtrar = (acum: Record<string, unknown>[]) =>
    estado.facturas.filter((f) => acum.every((c) => coincide(f as unknown as Record<string, unknown>, c)));
  const cadena = (acum: Record<string, unknown>[] = []): any => ({
    where: (cond: Record<string, unknown>) => cadena([...acum, cond]),
    orderBy: () => cadena(acum),
    all: async () => filtrar(acum),
    first: async () => filtrar(acum)[0] ?? null,
    update: async (patch: Record<string, unknown>) => {
      const hallados = filtrar(acum);
      hallados.forEach((f) => Object.assign(f, patch));
      return hallados[0] ?? null;
    },
    delete: async () => {
      filtrar(acum).forEach((f) => estado.facturas.splice(estado.facturas.indexOf(f), 1));
      return null;
    },
  });
  const orm = {
    Cliente: {
      where: (cond: Record<string, unknown>) => ({
        first: async () =>
          estado.clientes.find((c) => coincide(c as unknown as Record<string, unknown>, cond)) ?? null,
      }),
    },
    Factura: {
      where: (cond: Record<string, unknown>) => cadena([cond]),
      orderBy: () => cadena([]),
      create: async (data: Record<string, unknown>) => {
        const fila = { ...data, id: BigInt(estado.facturas.length + 1) };
        estado.facturas.push(fila);
        return fila;
      },
    },
  };
  const db = {
    orm: { public: orm },
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ orm: { public: orm } }),
  };
  return new FacturasService({ db } as unknown as PrismaService);
}

describe('FacturasService', () => {
  it('lista facturas en el shape de Invoice', async () => {
    const estado = crearEstado();
    estado.facturas.push(
      {
        id: 1n, clienteId: 1n, anio: 2026, mes: 3, tipo: 'monthly',
        nombre: 'ACME Servicios', rut: '11.111.111-1', monto: '50000.00',
        descripcion: 'Honorarios marzo', numero: 'F-001',
        fecha: '2026-03-31', nota: 'Pendiente', creadoEn: null,
      },
      {
        id: 2n, clienteId: 1n, anio: 2026, mes: 4, tipo: 'extra',
        nombre: 'ACME Servicios', rut: '11.111.111-1', monto: '12000.00',
        descripcion: 'Gasto administrativo', numero: null,
        fecha: null, nota: null, creadoEn: null,
      },
    );
    const service = crearServicio(estado);
    const lista = await service.listar('1');
    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({
      id: '1',
      clientId: '1',
      period: '2026-03',
      kind: 'monthly',
      name: 'ACME Servicios',
      rut: '11.111.111-1',
      amount: 50000,
      description: 'Honorarios marzo',
      number: 'F-001',
      date: '2026-03-31',
      note: 'Pendiente',
    });
    expect(lista[1]).toMatchObject({ kind: 'extra', number: '', date: '', note: '' });
  });

  it('guardar crea la fila con número y fecha juntos', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    const factura = await service.guardar('1', {
      anio: 2026,
      mes: 5,
      kind: 'monthly',
      name: 'ACME Servicios',
      rut: '11.111.111-1',
      amount: 80000,
      description: 'Honorarios mayo',
      number: 'F-002',
      date: '2026-05-31',
      note: '',
    });
    expect(estado.facturas).toHaveLength(1);
    expect(estado.facturas[0]).toMatchObject({
      clienteId: 1n, anio: 2026, mes: 5, tipo: 'monthly',
      nombre: 'ACME Servicios', rut: '11.111.111-1',
      monto: '80000.00', descripcion: 'Honorarios mayo',
      numero: 'F-002', nota: null,
    });
    expect(String(estado.facturas[0]?.fecha)).toBe('2026-05-31');
    expect(factura).toMatchObject({
      clientId: '1', period: '2026-05', kind: 'monthly', amount: 80000,
    });
  });

  it('guardar acepta fila sin número ni fecha', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    await service.guardar('1', {
      anio: 2026, mes: 5, kind: 'extra', name: 'ACME',
      rut: '11.111.111-1', amount: 0, description: 'Sin costo',
    });
    expect(estado.facturas[0]).toMatchObject({ numero: null, fecha: null, monto: '0.00' });
  });

  it('guardar valida tipo, montos, descripción y par número/fecha', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    const base = {
      anio: 2026, mes: 5, name: 'ACME', rut: '11.111.111-1',
      description: 'Honorarios', amount: 100,
    };
    await expect(service.guardar('1', { ...base, kind: 'anual' }))
      .rejects.toThrow('Tipo de factura inválido');
    await expect(service.guardar('1', { ...base, kind: 'monthly', amount: -1 }))
      .rejects.toThrow('entero ≥ 0');
    await expect(service.guardar('1', { ...base, kind: 'monthly', amount: 1.5 }))
      .rejects.toThrow('entero ≥ 0');
    await expect(service.guardar('1', { ...base, kind: 'monthly', description: '   ' }))
      .rejects.toThrow('description');
    await expect(service.guardar('1', { ...base, kind: 'monthly', name: '' }))
      .rejects.toThrow('name');
    await expect(service.guardar('1', { ...base, kind: 'monthly', number: 'F-1' }))
      .rejects.toThrow('Completa número y fecha de factura juntos');
    await expect(service.guardar('1', { ...base, kind: 'monthly', date: '2026-05-31' }))
      .rejects.toThrow('Completa número y fecha de factura juntos');
    await expect(service.guardar('1', { ...base, kind: 'monthly', note: 'x'.repeat(1001) }))
      .rejects.toThrow('note');
    expect(estado.facturas).toHaveLength(0);
  });

  it('guardar rechaza cliente desconocido y fechas inválidas', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    await expect(
      service.guardar('9', {
        anio: 2026, mes: 5, kind: 'monthly', name: 'ACME',
        rut: '11.111.111-1', amount: 100, description: 'Honorarios',
      }),
    ).rejects.toThrow('Cliente no encontrado');
    await expect(
      service.guardar('1', {
        anio: 2026, mes: 5, kind: 'monthly', name: 'ACME',
        rut: '11.111.111-1', amount: 100, description: 'Honorarios',
        number: 'F-1', date: '2026-13-40',
      }),
    ).rejects.toThrow('date inválida');
  });

  it('eliminar borra y falla si no existe', async () => {
    const estado = crearEstado();
    estado.facturas.push({
      id: 1n, clienteId: 1n, anio: 2026, mes: 3, tipo: 'monthly',
      nombre: 'ACME', rut: '11.111.111-1', monto: '10.00',
      descripcion: 'Prueba', numero: null, fecha: null, nota: null, creadoEn: null,
    });
    const service = crearServicio(estado);

    await expect(service.eliminar('abc')).rejects.toThrow('facturaId inválido');
    await expect(service.eliminar('9999')).rejects.toThrow('Factura no encontrada');
    const borrado = await service.eliminar('1');
    expect(borrado).toMatchObject({ id: '1', deleted: true });
    expect(estado.facturas).toHaveLength(0);
  });

  it('actualizar edita la fila y puede cambiar de cliente', async () => {
    const estado = crearEstado();
    estado.clientes.push({ id: 2n });
    estado.facturas.push({
      id: 1n, clienteId: 1n, anio: 2026, mes: 3, tipo: 'extra',
      nombre: 'ACME', rut: '11.111.111-1', monto: '10.00',
      descripcion: 'Prueba', numero: null, fecha: null, nota: null, creadoEn: null,
    });
    const service = crearServicio(estado);

    const actualizada = await service.actualizar('1', {
      clientId: '2',
      anio: 2026,
      mes: 4,
      kind: 'extra',
      name: 'Beta SpA',
      rut: '22.222.222-2',
      amount: 25000,
      description: 'Servicio extra',
      number: 'F-010',
      date: '2026-04-30',
      note: 'Observación',
    });
    expect(estado.facturas[0]).toMatchObject({
      clienteId: 2n, anio: 2026, mes: 4, tipo: 'extra',
      nombre: 'Beta SpA', rut: '22.222.222-2',
      monto: '25000.00', descripcion: 'Servicio extra',
      numero: 'F-010', nota: 'Observación',
    });
    expect(String(estado.facturas[0]?.fecha)).toBe('2026-04-30');
    expect(actualizada).toMatchObject({
      id: '1', clientId: '2', period: '2026-04', kind: 'extra', amount: 25000,
    });
  });

  it('actualizar valida y falla si no existe', async () => {
    const estado = crearEstado();
    const service = crearServicio(estado);
    const base = {
      anio: 2026, mes: 3, kind: 'extra', name: 'ACME',
      rut: '11.111.111-1', amount: 100, description: 'Prueba',
    };
    await expect(service.actualizar('abc', base)).rejects.toThrow('facturaId inválido');
    await expect(service.actualizar('9999', base)).rejects.toThrow('Factura no encontrada');
    await expect(
      service.actualizar('1', { ...base, kind: 'anual' }),
    ).rejects.toThrow('Tipo de factura inválido');
    await expect(
      service.actualizar('1', { ...base, number: 'F-1' }),
    ).rejects.toThrow('Completa número y fecha de factura juntos');
  });
});
