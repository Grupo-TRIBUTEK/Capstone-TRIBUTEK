import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PeriodosController } from './periodos.controller.js';
import { PeriodosService } from './periodos.service.js';

// Períodos contables por cliente. EXPORTA PeriodosService porque F29Module
// necesita `asegurar()` antes de escribir `proyecciones_f29.periodo_id`.
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [PeriodosController],
  providers: [PeriodosService],
  exports: [PeriodosService],
})
export class PeriodosModule {}