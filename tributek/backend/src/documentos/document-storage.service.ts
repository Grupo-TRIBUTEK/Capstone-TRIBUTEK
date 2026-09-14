import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export type StoredDocument = {
  key: string;
};

export interface DocumentStorage {
  save(file: { originalname: string; buffer: Buffer }): Promise<StoredDocument>;
  open(key: string): Promise<ReturnType<typeof createReadStream>>;
  remove(key: string): Promise<void>;
}

/**
 * Implementación de desarrollo. DocumentStorage permite reemplazar este
 * proveedor por S3, R2 o GCS sin modificar la lógica documental.
 */
@Injectable()
export class LocalDocumentStorageService implements DocumentStorage {
  private readonly root = resolve(process.cwd(), 'uploads', 'documentos');

  async save(file: { originalname: string; buffer: Buffer }): Promise<StoredDocument> {
    await mkdir(this.root, { recursive: true });
    const extension = basename(file.originalname).match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
    const key = `${randomUUID()}${extension.toLowerCase()}`;
    await writeFile(join(this.root, key), file.buffer);
    return { key };
  }

  async open(key: string) {
    const path = this.pathFor(key);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('El archivo del documento no está disponible.');
    }
    return createReadStream(path);
  }

  async remove(key: string) {
    await unlink(this.pathFor(key)).catch(() => undefined);
  }

  private pathFor(key: string) {
    const safeKey = basename(key);
    return join(this.root, safeKey);
  }
}
