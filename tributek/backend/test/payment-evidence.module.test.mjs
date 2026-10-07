import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// Exercise emitted Nest dependency metadata without connecting to the real DB.
process.env.JWT_SECRET = 'payment-evidence-module-regression-test-only';
const { PaymentEvidenceModule } = await import('../dist/payment-evidence/payment-evidence.module.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const { JwtService } = await import('@nestjs/jwt');

test('payment evidence initializes with JWT options and keeps its routes protected', async () => {
  const module = await Test.createTestingModule({ imports: [PaymentEvidenceModule] })
    .overrideProvider(PrismaService)
    .useValue({ db: { orm: { public: { Cliente: { where: () => ({ first: async () => null }) } } } } })
    .compile();
  const app = module.createNestApplication();
  try {
    await app.init();
    await request(app.getHttpServer()).get('/payment-evidence/987654321').expect(401);
    await request(app.getHttpServer()).get('/payment-evidence/987654321')
      .set('Authorization', 'Bearer invalid-token').expect(401);
    const jwt = module.get(JwtService);
    const token = jwt.sign({ sub: '1', nombreUsuario: 'module-test', rolId: '1', rolNombre: 'ADMIN' });
    const result = await request(app.getHttpServer()).get('/payment-evidence/987654321')
      .set('Authorization', `Bearer ${token}`).expect(404);
    assert.equal(result.body.message, 'Cliente no encontrado.');
  } finally {
    await app.close();
  }
});
