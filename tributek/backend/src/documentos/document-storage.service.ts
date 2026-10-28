/**
 * Lógica de documentos y archivos asociados. Aquí se coordinan validaciones y operaciones del módulo.
 */
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

  /** Guarda el archivo físico con una clave aleatoria y conserva su extensión. */
  async save(file: { originalname: string; buffer: Buffer }): Promise<StoredDocument> {
    await mkdir(this.root, { recursive: true });
    const extension =
      basename(file.originalname).match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
    const key = `${randomUUID()}${extension.toLowerCase()}`;
    await writeFile(join(this.root, key), file.buffer);
    return { key };
  }

  /** Abre un stream para leer el archivo por partes; informa 404 si no está disponible. */
  async open(key: string) {
    const path = this.pathFor(key);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('El archivo del documento no está disponible.');
    }
    return createReadStream(path);
  }

  /** Intenta eliminar el archivo físico y tolera que ya no exista. */
  async remove(key: string) {
    await unlink(this.pathFor(key)).catch(() => undefined);
  }

  /** Construye la ruta dentro del directorio de documentos utilizando solo el nombre base de la clave. */
  private pathFor(key: string) {
    const safeKey = basename(key);
    return join(this.root, safeKey);
  }
}
