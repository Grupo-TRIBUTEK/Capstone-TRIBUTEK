import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));
import {
  PaymentEvidenceService,
  fileType,
  type Upload,
} from './payment-evidence.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
const admin = { id: '1', rolId: '1' };
const client = { id: '2', rolId: '2', rolNombre: 'CLIENTE' };
const stranger = { id: '3', rolId: '2', rolNombre: 'CLIENTE' };
function pdf(): Upload {
  const buffer = Buffer.from('%PDF-1.7 test');
  return {
    originalname: 'comprobante.pdf',
    mimetype: 'application/pdf',
    buffer,
    size: buffer.length,
  };
}
describe('Payment evidence access and persistence', () => {
  let dir: string;
  let service: PaymentEvidenceService;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tributek-receipts-'));
    process.env.PAYMENT_EVIDENCE_ROOT = dir;
    const Cliente = { where: () => ({ first: async () => ({ id: 10n }) }) };
    const UsuarioCliente = {
      where: ({ usuarioId }: { usuarioId: bigint }) => ({
        first: async () => (usuarioId === 2n ? { clienteId: 10n } : null),
      }),
    };
    const db = { db: { orm: { public: { Cliente, UsuarioCliente } } } };
    service = new PaymentEvidenceService(db as unknown as PrismaService);
  });
  afterEach(async () => {
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep)) throw new Error("Unexpected test directory");
    await rm(dir, { recursive: true, force: true });
    delete process.env.PAYMENT_EVIDENCE_ROOT;
  });
  it('retains multiple files and both accounts after correcting the same payment', async () => {
    await service.register('10', 'payment-1', admin, {
      date: '2026-09-20',
      amount: 1000,
    });
    await service.upload('10', 'payment-1', client, [pdf(), pdf()], {
      method: 'Transferencia',
      origin: 'Banco A · 123',
      destination: 'Banco B · 456',
      amount: '500',
    });
    const saved = await service.register('10', 'payment-1', admin, {
      date: '2026-09-21',
      amount: 1000,
    });
    expect(saved.files).toHaveLength(2);
    expect(saved.files[0].origin).toBe('Banco A · 123');
    expect(saved.files[0].destination).toBe('Banco B · 456');
    expect(await service.list('10', client)).toHaveLength(1);
  });
  it('rejects foreign users for listing, uploading and downloading', async () => {
    await service.register('10', 'payment-1', admin, {
      date: '2026-09-20',
      amount: 1000,
    });
    await expect(service.list('10', stranger)).rejects.toThrow();
    await expect(
      service.upload('10', 'payment-1', stranger, [pdf()], {
        method: 'Efectivo',
      }),
    ).rejects.toThrow();
    await expect(
      service.download('10', 'payment-1', 'missing', stranger),
    ).rejects.toThrow();
    await expect(
      service.register('10', 'forged', client, {
        date: '2026-09-20',
        amount: 1000,
      }),
    ).rejects.toThrow();
  });
  it('does not accept an HTML file renamed as PDF or a traversal identifier', async () => {
    const bad = pdf();
    bad.buffer = Buffer.from('<html>bad');
    bad.size = bad.buffer.length;
    expect(() => fileType(bad)).toThrow();
    await expect(
      service.register('10', '../outside', admin, {
        date: '2026-09-20',
        amount: 1000,
      }),
    ).rejects.toThrow();
  });
  it('keeps simultaneous uploads and excludes archived payments from the portal', async () => {
    await service.register('10', 'payment-1', admin, {
      date: '2026-09-20',
      amount: 1000,
    });
    await Promise.all([
      service.upload('10', 'payment-1', client, [pdf()], {
        method: 'Efectivo',
      }),
      service.upload('10', 'payment-1', admin, [pdf()], {
        method: 'Transferencia',
      }),
    ]);
    const folder = await service.get('10', 'payment-1', admin);
    expect(folder.files).toHaveLength(2);
    const adminFile = folder.files.find((f) => f.userId === '1')!;
    await expect(
      service.remove('10', 'payment-1', adminFile.id, client),
    ).rejects.toThrow();
    await service.archive('10', 'payment-1', admin);
    expect(await service.list('10', client)).toHaveLength(0);
    await expect(
      service.upload('10', 'payment-1', client, [pdf()], {
        method: 'Efectivo',
      }),
    ).rejects.toThrow();
  });
  it('rejects oversized batches without partially saving files', async()=>{
    await service.register('10','payment-1',admin,{date:'2026-09-20',amount:1000});
    const large=pdf();large.buffer=Buffer.alloc(5*1024*1024);large.buffer.write('%PDF-');large.size=large.buffer.length;
    await expect(service.upload('10','payment-1',client,[large,large],{method:'Efectivo'})).rejects.toThrow('8 MB');
    expect((await service.get('10','payment-1',client)).files).toHaveLength(0);
    await expect(service.register('10','invalid-date',admin,{date:'2026-02-30',amount:1000})).rejects.toThrow();
  });

});
