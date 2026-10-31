/**
 * Lógica de conexión entre el backend y PostgreSQL. Aquí se coordinan validaciones y operaciones del módulo.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = db;

  /** Conecta el ORM usando DATABASE_URL al inicializar el servicio. */
  async onModuleInit() {
    await this.db.connect({
      url: process.env['DATABASE_URL']!,
    });
  }
  /** Cierra la conexión y libera sus recursos al destruir el servicio. */
  async onModuleDestroy() {
    await this.db.close();
  }
}
