/**
 * Rutas HTTP de directorio de clientes y cuentas del portal. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
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

  /** Crear una ficha de cliente. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  /** Actualizar una ficha de cliente. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  actualizarCliente(@Param('id') id: string, @Body() datos: CreateClienteDto) {
    return this.clientesService.actualizarCliente(id, datos);
  }

  /** Generar una nueva invitación de acceso. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post(':id/acceso-portal/enlace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  generarNuevoEnlaceInvitacion(@Param('id') id: string) {
    return this.clientesService.generarNuevoEnlaceInvitacion(id);
  }

  /** Generar un enlace de restablecimiento. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post(':id/acceso-portal/restablecimiento')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  generarEnlaceRestablecimiento(@Param('id') id: string) {
    return this.clientesService.generarEnlaceRestablecimiento(id);
  }

  /** Consultar el acceso al portal. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get(':id/acceso-portal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerAccesoPortal(@Param('id') id: string) {
    return this.clientesService.obtenerAccesoPortal(id);
  }

  /** Consultar los clientes del usuario autenticado. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get('mis-clientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE')
  obtenerMisClientes(@Req() request: { user: { id: string } }) {
    return this.clientesService.obtenerMisClientes(request.user.id);
  }

  /** Buscar en el directorio de clientes. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerClientes(@Query('buscar') buscar?: string) {
    return this.clientesService.obtenerClientes(buscar);
  }

  /** Consultar una ficha por ID. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 1)
  obtenerCliente(@Param('id') id: string) {
    return this.clientesService.obtenerCliente(id);
  }
}
