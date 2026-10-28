/**
 * Rutas HTTP de períodos contables por cliente, año y mes. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarPeriodoDto } from './dto/guardar-periodo.dto.js';
import { PeriodosService } from './periodos.service.js';

@Controller('periodos')
@UseGuards(JwtAuthGuard)
export class PeriodosController {
  constructor(private readonly periodosService: PeriodosService) {}

  /** Consultar los registros con los filtros recibidos. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Query() filters: { clienteId?: string; anio?: string; mes?: string }) {
    return this.periodosService.listar(filters);
  }

  /** Guardar los datos recibidos. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardar(@Body() data: GuardarPeriodoDto) {
    return this.periodosService.guardar(data);
  }
}
