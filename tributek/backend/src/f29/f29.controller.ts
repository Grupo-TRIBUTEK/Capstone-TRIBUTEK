/**
 * Rutas HTTP de proyecciones informativas y fuentes RCV. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
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

  /** Consultar la proyección del cliente y período. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get('proyeccion/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  obtener(
    @Param('clienteId') clienteId: string,
    @Query() filters: { anio?: string; mes?: string },
  ) {
    return this.f29Service.obtener(clienteId, filters.anio ?? '', filters.mes ?? '');
  }

  /** Guardar los datos recibidos. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
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
