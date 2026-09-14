import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DocumentosController } from './documentos.controller.js';
import { LocalDocumentStorageService } from './document-storage.service.js';
import { DocumentosService } from './documentos.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [DocumentosController],
  providers: [DocumentosService, LocalDocumentStorageService],
})
export class DocumentosModule {}
