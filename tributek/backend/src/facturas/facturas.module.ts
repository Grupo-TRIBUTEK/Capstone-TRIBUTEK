/**
 * Configura el módulo de registros de facturación: declara las dependencias que Nest debe conectar.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FacturasController } from './facturas.controller.js';
import { FacturasService } from './facturas.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturasModule {}
