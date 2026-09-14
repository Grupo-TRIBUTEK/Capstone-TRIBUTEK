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
  } as any);

  return service;
}

describe('ClientesService', () => {
  it('devuelve todos los clientes cuando no hay búsqueda', async () => {
    const clientes = [
      { id: 2, nombreRazonSocial: 'Beta SpA', rut: '22-2' },
      { id: 1, nombreRazonSocial: 'Alfa Ltda.', rut: '11-1' },
    ];

    await expect(createService(clientes).obtenerClientes()).resolves.toEqual(
      clientes,
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
    ).resolves.toEqual([clientes[0], clientes[2]]);
  });
});