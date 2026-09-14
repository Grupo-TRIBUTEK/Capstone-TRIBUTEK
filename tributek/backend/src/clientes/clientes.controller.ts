import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  @Roles(1)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  actualizarCliente(@Param('id') id: string, @Body() datos: CreateClienteDto) {
    return this.clientesService.actualizarCliente(id, datos);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  obtenerClientes(@Query('buscar') buscar?: string) {
    return this.clientesService.obtenerClientes(buscar);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  obtenerCliente(@Param('id') id: string) {
    return this.clientesService.obtenerCliente(id);
  }
}
