import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientesService } from './clientes.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

// Endpoints de consulta y registro de clientes.

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  actualizarCliente(@Param('id') id: string, @Body() datos: CreateClienteDto) {
    return this.clientesService.actualizarCliente(id, datos);
  }

  @Post(':id/acceso-portal/enlace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  generarNuevoEnlaceInvitacion(@Param('id') id: string) {
    return this.clientesService.generarNuevoEnlaceInvitacion(id);
  }

  @Post(':id/acceso-portal/restablecimiento')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  generarEnlaceRestablecimiento(@Param('id') id: string) {
    return this.clientesService.generarEnlaceRestablecimiento(id);
  }

  @Get(':id/acceso-portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerAccesoPortal(@Param('id') id: string) {
    return this.clientesService.obtenerAccesoPortal(id);
  }

  @Get('mis-clientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE')
  obtenerMisClientes(@Req() request: { user: { id: string } }) {
    return this.clientesService.obtenerMisClientes(request.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerClientes(@Query('buscar') buscar?: string) {
    return this.clientesService.obtenerClientes(buscar);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerCliente(@Param('id') id: string) {
    return this.clientesService.obtenerCliente(id);
  }
}
