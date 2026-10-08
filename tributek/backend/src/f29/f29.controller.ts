import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarProyeccionDto } from './dto/guardar-proyeccion.dto.js';
import { F29Service } from './f29.service.js';

@Controller('f29')
@UseGuards(JwtAuthGuard)
export class F29Controller {
  constructor(private readonly f29Service: F29Service) {}

  @Get('proyeccion/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  obtener(
    @Param('clienteId') clienteId: string,
    @Query() filters: { anio?: string; mes?: string },
  ) {
    return this.f29Service.obtener(clienteId, filters.anio ?? '', filters.mes ?? '');
  }

  @Put('proyeccion/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardar(
    @Param('clienteId') clienteId: string,
    @Body() data: GuardarProyeccionDto,
    @Req() request: any,
  ) {
    return this.f29Service.guardar(clienteId, data, request.user.id);
  }
}