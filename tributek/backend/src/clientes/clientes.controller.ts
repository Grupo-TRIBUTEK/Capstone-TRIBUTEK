import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

// exponemos el endpoint que recibirá los datos del formulario.

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  obtenerClientes() {
    return this.clientesService.obtenerClientes();
  }
}
