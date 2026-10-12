import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GuardarMesDto } from './dto/guardar-mes.dto.js';
import { GuardarPostergacionDto } from './dto/guardar-postergacion.dto.js';
import { RegistrarAbonoDto } from './dto/registrar-abono.dto.js';
import { ObligacionesService } from './obligaciones.service.js';

@Controller('obligaciones')
@UseGuards(JwtAuthGuard)
export class ObligacionesController {
  constructor(private readonly obligacionesService: ObligacionesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  async listarTodo(@Query('periodo') periodo?: string) {
    return this.obligacionesService.listarTodo(periodo);
  }

  @Get('meses/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Param('clienteId') clienteId: string) {
    return this.obligacionesService.listarMeses(clienteId);
  }

  @Put('mes/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  guardar(@Param('clienteId') clienteId: string, @Body() data: GuardarMesDto) {
    return this.obligacionesService.guardarMes(clienteId, data);
  }

  @Post('abonos/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  registrar(@Param('clienteId') clienteId: string, @Body() data: RegistrarAbonoDto) {
    return this.obligacionesService.registrarAbono(clienteId, data);
  }

  @Delete('abonos/:abonoId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  eliminar(@Param('abonoId') abonoId: string) {
    return this.obligacionesService.eliminarAbono(abonoId);
  }

  @Get('postergaciones/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listarPostergaciones(@Param('clienteId') clienteId: string) {
    return this.obligacionesService.listarPostergaciones(clienteId);
  }

  @Post('postergaciones/:clienteId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  crearPostergacion(
    @Param('clienteId') clienteId: string,
    @Body() data: GuardarPostergacionDto,
  ) {
    return this.obligacionesService.crearPostergacion(clienteId, data);
  }

  @Put('postergaciones/:postergacionId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  actualizarPostergacion(
    @Param('postergacionId') postergacionId: string,
    @Body() data: GuardarPostergacionDto,
  ) {
    return this.obligacionesService.actualizarPostergacion(postergacionId, data);
  }

  @Delete('postergaciones/:postergacionId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  eliminarPostergacion(@Param('postergacionId') postergacionId: string) {
    return this.obligacionesService.eliminarPostergacion(postergacionId);
  }
}
