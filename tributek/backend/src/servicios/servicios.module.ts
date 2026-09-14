import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServiciosController } from './servicios.controller.js';
import { ServiciosService } from './servicios.service.js';

@Module({
  imports: [PrismaModule, AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ServiciosController],
  providers: [ServiciosService],
})
export class ServiciosModule {}
