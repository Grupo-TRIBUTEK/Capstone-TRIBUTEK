/**
 * Configura el módulo de montos mensuales, abonos y postergaciones: declara las dependencias que Nest debe conectar.
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { PeriodosModule } from '../periodos/periodos.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ObligacionesController } from './obligaciones.controller.js';
import { ObligacionesService } from './obligaciones.service.js';

// Obligaciones (meses, montos por concepto y abonos). IMPORTA PeriodosModule
// porque `meses_cliente.periodo_id` es FK NOT NULL: el service llama a
// `periodos.asegurar()` antes de escribir (mismo patrón que F29).
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PeriodosModule,
  ],
  controllers: [ObligacionesController],
  providers: [ObligacionesService],
})
export class ObligacionesModule {}
