/** Pruebas de clientes. Cada test/it nombra el comportamiento esperado; los datos y dependencias de ensayo permiten comprobarlo de forma repetible. */
import { ClientesService } from './clientes.service.js';

type Cliente = {
  id: number;
  nombreRazonSocial: string;
  rut: string;
};

function createService(clientes: Cliente[]) {
  const field = (value: string) => ({
    ilike: (pattern: string) =>
      value.toLocaleLowerCase().includes(pattern.replace(/%/g, '').toLocaleLowerCase()),
  });

  const service = new ClientesService({
    db: {
      orm: {
        public: {
          Cliente: {
            orderBy: () => ({
              all: async () => clientes,
              where: (predicate: (cliente: Cliente) => boolean) => ({
                all: async () =>
                  clientes.filter((cliente) =>
                    predicate({
                      ...cliente,
                      nombreRazonSocial: field(cliente.nombreRazonSocial),
                      rut: field(cliente.rut),
                    } as any),
                  ),
              }),
            }),
          },
        },
      },
    },
  } as any, {} as any);

  return service;
}

describe('ClientesService', () => {
  it('devuelve todos los clientes cuando no hay búsqueda', async () => {
    const clientes = [
      { id: 2, nombreRazonSocial: 'Beta SpA', rut: '22-2' },
      { id: 1, nombreRazonSocial: 'Alfa Ltda.', rut: '11-1' },
    ];

    await expect(createService(clientes).obtenerClientes()).resolves.toEqual(
      clientes.map(c => ({ ...c, id: String(c.id) })),
    );
  });

  it('busca por nombre o RUT sin duplicar resultados', async () => {
    const clientes = [
      { id: 3, nombreRazonSocial: 'Comercial ACME', rut: '76.123.456-7' },
      { id: 2, nombreRazonSocial: 'Otra Empresa', rut: '76.123.456-7' },
      { id: 1, nombreRazonSocial: 'ACME Servicios', rut: '11.111.111-1' },
    ];

    await expect(
      createService(clientes).obtenerClientes('  acme  '),
    ).resolves.toEqual([clientes[0], clientes[2]].map(c => ({ ...c, id: String(c!.id) })));
  });
});
describe('RUT al guardar clientes', () => {
  it('rechaza un RUT sin guion antes de crear un registro', async () => {
    const create = vi.fn()
    const service = new ClientesService({ db: { orm: { public: { Cliente: { create } } } } } as any, {} as any)
    await expect(service.crearCliente({ tipoCliente: 'Empresa', rut: '123456785', nombreRazonSocial: 'Ensayo', estado: 'Activo' })).rejects.toThrow('guion')
    expect(create).not.toHaveBeenCalled()
  })
  it('rechaza dos caracteres verificadores antes de actualizar un registro', async () => {
    const update = vi.fn()
    const service = new ClientesService({ db: { orm: { public: { Cliente: { where: () => ({ update }) } } } } } as any, {} as any)
    await expect(service.actualizarCliente('1', { tipoCliente: 'Empresa', rut: '12345678-KK', nombreRazonSocial: 'Ensayo', estado: 'Activo' })).rejects.toThrow('guion')
    expect(update).not.toHaveBeenCalled()
  })
})
