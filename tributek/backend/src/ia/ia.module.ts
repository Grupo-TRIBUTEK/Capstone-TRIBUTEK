import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { IaController } from './ia.controller.js';
import { IaService } from './ia.service.js';

@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
