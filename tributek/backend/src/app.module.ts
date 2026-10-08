import { PaymentEvidenceModule } from './payment-evidence/payment-evidence.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { ServiciosModule } from './servicios/servicios.module.js';
import { DocumentosModule } from './documentos/documentos.module.js';
import { GestionesModule } from './gestiones/gestiones.module.js';
import { PeriodosModule } from './periodos/periodos.module.js';
import { F29Module } from './f29/f29.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientesModule,
    ServiciosModule,
    DocumentosModule,
    PaymentEvidenceModule,
    GestionesModule,
    PeriodosModule,
    F29Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
