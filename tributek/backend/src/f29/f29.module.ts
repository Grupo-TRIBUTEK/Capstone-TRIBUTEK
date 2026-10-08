import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { PeriodosModule } from '../periodos/periodos.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { F29Controller } from './f29.controller.js';
import { F29Service } from './f29.service.js';

// Proyección F29. IMPORTA PeriodosModule porque `proyecciones_f29.periodo_id`
// es FK NOT NULL: el service llama a `periodos.asegurar()` antes de escribir.
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PeriodosModule,
  ],
  controllers: [F29Controller],
  providers: [F29Service],
})
export class F29Module {}