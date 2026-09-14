import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

// exponemos el endpoint que recibirá los datos del formulario.

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Get()
  obtenerClientes() {
    return this.clientesService.obtenerClientes();
  }
}