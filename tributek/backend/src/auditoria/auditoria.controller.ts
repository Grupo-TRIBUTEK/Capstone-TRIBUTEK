import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditoriaService } from './auditoria.service.js';
import { AuditoriaQueryDto } from './dto/auditoria-query.dto.js';

@Controller('auditoria')
@UseGuards(JwtAuthGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  async listar(@Query() query: AuditoriaQueryDto) {
    return this.auditoriaService.listar(query);
  }
}