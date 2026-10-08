import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// Verifica que PeriodosModule y F29Module arrancan con sus guards y rutas
// protegidas, sin conectar a la base real (patrón de payment-evidence).
process.env.JWT_SECRET = 'f29-periodos-module-regression-test-only';
const { PeriodosModule } = await import('../dist/periodos/periodos.module.js');
const { F29Module } = await import('../dist/f29/f29.module.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const { JwtService } = await import('@nestjs/jwt');

// Cadena del ORM que devuelve listas vacías (suficiente para listar/obtener
// antes de que exista cualquier fila).

const cadenaVacia = () => {
  const q = {
    where: () => q,
    orderBy: () => q,
    all: async () => [],
    first: async () => null,
  };
  return q;
};

const prismaFake = {
  db: {
    orm: {
      public: {
        Cliente: { where: () => ({ first: async () => null }) },
        PeriodoCliente: { where: () => cadenaVacia(), orderBy: () => cadenaVacia() },
        ProyeccionF29: { where: () => ({ first: async () => null }) },
        F29Movimiento: { where: () => cadenaVacia() },
      },
    },
  },
};

async function adminToken(module) {
  const jwt = module.get(JwtService);
  return jwt.sign({ sub: '1', nombreUsuario: 'module-test', rolId: '1', rolNombre: 'ADMIN' });
}

test('periodos expone el listado solo a ADMIN autenticado', async () => {
  const module = await Test.createTestingModule({ imports: [PeriodosModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaFake)
    .compile();
  const app = module.createNestApplication();
  try {
    await app.init();
    await request(app.getHttpServer()).get('/periodos').expect(401);
    await request(app.getHttpServer()).get('/periodos')
      .set('Authorization', 'Bearer invalid-token').expect(401);
    const token = await adminToken(module);
    const result = await request(app.getHttpServer()).get('/periodos')
      .set('Authorization', `Bearer ${token}`).expect(200);
    assert.deepEqual(result.body, []);
  } finally {
    await app.close();
  }
});

test('f29 protege la proyección y responde 404 con cliente inexistente', async () => {
  const module = await Test.createTestingModule({ imports: [F29Module] })
    .overrideProvider(PrismaService)
    .useValue(prismaFake)
    .compile();
  const app = module.createNestApplication();
  try {
    await app.init();
    await request(app.getHttpServer()).get('/f29/proyeccion/987654321').expect(401);
    await request(app.getHttpServer()).get('/f29/proyeccion/987654321')
      .set('Authorization', 'Bearer invalid-token').expect(401);
    const token = await adminToken(module);
    const result = await request(app.getHttpServer()).get('/f29/proyeccion/987654321?anio=2026&mes=3')
      .set('Authorization', `Bearer ${token}`).expect(404);
    assert.equal(result.body.message, 'Cliente no encontrado.');
  } finally {
    await app.close();
  }
});
