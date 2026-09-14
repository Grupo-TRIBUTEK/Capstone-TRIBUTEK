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

// Exponemos los endpoints que recibir�n y consultar�n los datos de clientes.

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  actualizarCliente(@Param('id') id: string, @Body() datos: CreateClienteDto) {
    return this.clientesService.actualizarCliente(id, datos);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  obtenerClientes(@Query('buscar') buscar?: string) {
    return this.clientesService.obtenerClientes(buscar);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  obtenerCliente(@Param('id') id: string) {
    return this.clientesService.obtenerCliente(id);
  }
}
