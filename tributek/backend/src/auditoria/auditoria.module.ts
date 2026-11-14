/**
 * Configura el módulo de consulta del historial de acciones: declara las dependencias que Nest debe conectar.
 */
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import { Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller.js';
import { AuditoriaService } from './auditoria.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor }],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
