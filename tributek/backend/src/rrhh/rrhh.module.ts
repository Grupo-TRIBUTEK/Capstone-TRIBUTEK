import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RrhhController } from './rrhh.controller.js';
import { RrhhService } from './rrhh.service.js';

@Module({
  imports: [PrismaModule, AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [RrhhController],
  providers: [RrhhService],
})
export class RrhhModule {}
