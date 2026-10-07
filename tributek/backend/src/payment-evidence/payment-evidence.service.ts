import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  rename,
  unlink,
} from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

type User = { id: string; rolId: string; rolNombre?: string };
export type Upload = {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
};
type Evidence = {
  id: string;
  name: string;
  mime: string;
  size: number;
  userId: string;
  createdAt: string;
  method: string;
  origin: string;
  destination: string;
  amount: number | null;
};
type Folder = {
  archived?: boolean;
  id: string;
  clientId: string;
  date: string;
  amount: number;
  files: Evidence[];
};
export const isAdmin = (u: User) =>
  Number(u.rolId) === 1 ||
  ['ADMIN', 'ADMINISTRADOR'].includes(String(u.rolNombre).toUpperCase());
export function fileType(f: Upload) {
  if (!f.size || f.size > 8 * 1024 * 1024 || f.buffer.length !== f.size)
    throw new BadRequestException(
      'Cada archivo debe pesar entre 1 byte y 8 MB.',
    );
  const b = f.buffer;
  if (b.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  throw new BadRequestException('Solo se permiten archivos PDF, PNG o JPG.');
}
@Injectable()
export class PaymentEvidenceService {
  private readonly root = resolve(
    process.env['PAYMENT_EVIDENCE_ROOT'] ||
      join(process.cwd(), 'uploads', 'payment-evidence'),
  );
  private queues = new Map<string, Promise<unknown>>();
  constructor(private readonly prisma: PrismaService) {}
  private id(value: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(value))
      throw new BadRequestException('Identificador inválido.');
    return value;
  }
  private path(client: string, id: string) {
    return join(this.root, this.id(client), this.id(id));
  }
  private async access(client: string, user: User) {
    if (!/^\d+$/.test(client))
      throw new BadRequestException('Cliente inválido.');
    if (!isAdmin(user)) {
      const relation = await this.prisma.db.orm.public.UsuarioCliente.where({
        usuarioId: BigInt(user.id),
        clienteId: BigInt(client),
      }).first();
      if (!relation)
        throw new ForbiddenException(
          'No tienes acceso a los pagos de este cliente.',
        );
    }
    if (
      !(await this.prisma.db.orm.public.Cliente.where({
        id: BigInt(client),
      }).first())
    )
      throw new NotFoundException('Cliente no encontrado.');
  }
  private async read(client: string, id: string): Promise<Folder> {
    try {
      return JSON.parse(
        await readFile(join(this.path(client, id), 'record.json'), 'utf8'),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        throw new NotFoundException('Carpeta de pago no encontrada.');
      throw e;
    }
  }
  private async write(folder: Folder) {
    const dir = this.path(folder.clientId, folder.id);
    await mkdir(dir, { recursive: true });
    const temp = join(dir, `${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(folder), { flag: 'wx' });
    await rename(temp, join(dir, 'record.json'));
  }
  private async locked<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) || Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    this.queues.set(key, next);
    try {
      return await next;
    } finally {
      if (this.queues.get(key) === next) this.queues.delete(key);
    }
  }
  async list(client: string, user: User) {
    await this.access(client, user);
    let names: string[];
    try {
      names = await readdir(join(this.root, this.id(client)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    const folders = await Promise.all(names.map((id) => this.read(client, id)));
    return folders
      .filter((f) => !f.archived)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  async get(client: string, id: string, user: User) {
    await this.access(client, user);
    return this.read(client, id);
  }
  async register(
    client: string,
    id: string,
    user: User,
    body: { date?: string; amount?: number },
  ) {
    if (!isAdmin(user)) throw new ForbiddenException();
    await this.access(client, user);
    this.id(id);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ||
      !Number.isFinite(Date.parse(body.date!)) ||
      new Date(body.date!).toISOString().slice(0, 10) !== body.date ||
      !Number.isSafeInteger(body.amount) ||
      Number(body.amount) <= 0
    )
      throw new BadRequestException('Monto o fecha inválidos.');
    return this.locked(this.path(client, id), async () => {
      let current: Folder | undefined;
      try {
        current = await this.read(client, id);
      } catch (e) {
        if (!(e instanceof NotFoundException)) throw e;
      }
      const folder: Folder = {
        id,
        clientId: client,
        date: body.date!,
        amount: body.amount!,
        files: current?.files || [],
      };
      await this.write(folder);
      return folder;
    });
  }
  async upload(
    client: string,
    id: string,
    user: User,
    files: Upload[],
    body: Record<string, string>,
  ) {
    await this.access(client, user);
    if (!files?.length || files.length > 10)
      throw new BadRequestException('Selecciona entre 1 y 10 archivos.');
    if (files.reduce((sum, f) => sum + f.size, 0) > 8 * 1024 * 1024)
      throw new BadRequestException('Máximo 8 MB en total por envío.');
    const types = files.map(fileType);
    const method = String(body.method || '').trim();
    const origin = String(body.origin || '').trim();
    const destination = String(body.destination || '').trim();
    if (
      !['Transferencia', 'Efectivo', 'Tarjeta', 'Otro'].includes(method) ||
      origin.length > 200 ||
      destination.length > 200
    )
      throw new BadRequestException('Revisa el método y las cuentas.');
    const amount = body.amount ? Number(body.amount) : null;
    if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0))
      throw new BadRequestException(
        'El monto respaldado debe ser un entero positivo.',
      );
    return this.locked(this.path(client, id), async () => {
      const folder = await this.read(client, id);
      if (folder.archived)
        throw new BadRequestException(
          'Este movimiento fue eliminado. No admite nuevos comprobantes.',
        );
      if (folder.files.length + files.length > 40)
        throw new BadRequestException('Máximo 40 archivos por pago.');
      if (amount !== null && amount > folder.amount)
        throw new BadRequestException(
          'El monto respaldado supera el pago registrado.',
        );
      const added = files.map((f, i): Evidence => ({
        id: randomUUID(),
        name: f.originalname
          .replace(/[\\/\r\n\u0000-\u001f]/g, '_')
          .slice(0, 180),
        mime: types[i],
        size: f.size,
        userId: user.id,
        createdAt: new Date().toISOString(),
        method,
        origin: method === 'Efectivo' ? '' : origin,
        destination: method === 'Efectivo' ? '' : destination,
        amount,
      }));
      try {
        for (let i = 0; i < files.length; i++)
          await writeFile(
            join(this.path(client, id), added[i].id),
            files[i].buffer,
            { flag: 'wx' },
          );
        folder.files.push(...added);
        await this.write(folder);
        return folder;
      } catch (e) {
        await Promise.all(
          added.map((f) =>
            unlink(join(this.path(client, id), f.id)).catch(() => undefined),
          ),
        );
        throw e;
      }
    });
  }
  async download(client: string, id: string, fileId: string, user: User) {
    const folder = await this.get(client, id, user);
    const file = folder.files.find((f) => f.id === fileId);
    if (!file) throw new NotFoundException('Archivo no encontrado.');
    return {
      file,
      stream: createReadStream(join(this.path(client, id), this.id(fileId))),
    };
  }
  async archive(client: string, id: string, user: User) {
    if (!isAdmin(user)) throw new ForbiddenException();
    await this.access(client, user);
    return this.locked(this.path(client, id), async () => {
      let folder: Folder;
      try {
        folder = await this.read(client, id);
      } catch (e) {
        if (e instanceof NotFoundException) return { archived: true };
        throw e;
      }
      folder.archived = true;
      await this.write(folder);
      return { archived: true };
    });
  }
  async remove(client: string, id: string, fileId: string, user: User) {
    await this.access(client, user);
    return this.locked(this.path(client, id), async () => {
      const folder = await this.read(client, id);
      const file = folder.files.find((f) => f.id === fileId);
      if (!file) throw new NotFoundException();
      if (!isAdmin(user) && file.userId !== user.id)
        throw new ForbiddenException(
          'Solo puedes quitar archivos que hayas subido.',
        );
      folder.files = folder.files.filter((f) => f.id !== fileId);
      await this.write(folder);
      await unlink(join(this.path(client, id), this.id(fileId))).catch(
        () => undefined,
      );
      return folder;
    });
  }
}
