/**
 * Rutas HTTP de registros de facturación. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarFacturaDto } from './dto/guardar-factura.dto.js';
import { FacturasService } from './facturas.service.js';

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  /** Consultar los registros con los filtros recibidos. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get(':clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Param('clienteId') clienteId: string) {
    return this.facturasService.listar(clienteId);
  }

  /** Guardar los datos recibidos. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post(':clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardar(@Param('clienteId') clienteId: string, @Body() data: GuardarFacturaDto) {
    return this.facturasService.guardar(clienteId, data);
  }

  /** Actualizar el registro identificado. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Put(':facturaId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  actualizar(@Param('facturaId') facturaId: string, @Body() data: GuardarFacturaDto) {
    return this.facturasService.actualizar(facturaId, data);
  }

  /** Eliminar el registro identificado. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Delete(':facturaId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  eliminar(@Param('facturaId') facturaId: string) {
    return this.facturasService.eliminar(facturaId);
  }
}
