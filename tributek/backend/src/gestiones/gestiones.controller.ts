import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarFormalizacionDto } from './dto/guardar-formalizacion.dto.js';
import { GestionesService } from './gestiones.service.js';

@Controller('gestiones')
@UseGuards(JwtAuthGuard)
export class GestionesController {
  constructor(private readonly gestionesService: GestionesService) {}

  @Get('formalizacion/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  obtenerFormalizacion(@Param('clienteId') clienteId: string) {
    return this.gestionesService.obtenerFormalizacion(clienteId);
  }

  @Put('formalizacion/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardarFormalizacion(
    @Param('clienteId') clienteId: string,
    @Body() data: GuardarFormalizacionDto,
    @Req() request: any,
  ) {
    return this.gestionesService.guardarFormalizacion(clienteId, data, request.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Query() filters: { clienteId?: string; tipo?: string }) {
    return this.gestionesService.listar(filters);
  }
}