import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = db;

  async onModuleInit() {
  await this.db.connect({
    url: process.env['DATABASE_URL']!,
  });
}
  async onModuleDestroy() {
    await this.db.close();
  }
}