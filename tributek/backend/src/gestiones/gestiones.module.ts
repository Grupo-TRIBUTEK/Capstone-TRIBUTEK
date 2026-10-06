import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GestionesController } from './gestiones.controller.js';
import { GestionesService } from './gestiones.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [GestionesController],
  providers: [GestionesService],
})
export class GestionesModule {}