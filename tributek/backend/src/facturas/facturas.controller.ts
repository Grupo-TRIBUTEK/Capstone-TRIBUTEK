import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarFacturaDto } from './dto/guardar-factura.dto.js';
import { FacturasService } from './facturas.service.js';

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get(':clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Param('clienteId') clienteId: string) {
    return this.facturasService.listar(clienteId);
  }

  @Post(':clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardar(@Param('clienteId') clienteId: string, @Body() data: GuardarFacturaDto) {
    return this.facturasService.guardar(clienteId, data);
  }

  @Put(':facturaId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  actualizar(@Param('facturaId') facturaId: string, @Body() data: GuardarFacturaDto) {
    return this.facturasService.actualizar(facturaId, data);
  }

  @Delete(':facturaId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  eliminar(@Param('facturaId') facturaId: string) {
    return this.facturasService.eliminar(facturaId);
  }
}
