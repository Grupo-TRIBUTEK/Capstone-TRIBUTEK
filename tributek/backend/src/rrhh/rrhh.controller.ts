import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto.js';
import { RrhhService } from './rrhh.service.js';

@Controller('rrhh')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1)
export class RrhhController {
  constructor(private readonly rrhhService: RrhhService) {}

  @Get()
  resumenYEmpresas(
    @Query('buscar') buscar?: string,
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.rrhhService.resumenYEmpresas({ buscar, clienteId, estado });
  }

  @Post('trabajadores')
  crearTrabajador(@Body() datos: CreateTrabajadorDto) {
    return this.rrhhService.crearTrabajador(datos);
  }
}
