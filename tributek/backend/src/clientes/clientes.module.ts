import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller.js';
import { ClientesService } from './clientes.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PrismaModule, AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}