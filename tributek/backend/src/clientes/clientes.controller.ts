import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientesService } from './clientes.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

// Exponemos los endpoints que recibirán y consultarán los datos de clientes.

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  crearCliente(@Body() datos: CreateClienteDto) {
    return this.clientesService.crearCliente(datos);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  obtenerClientes(@Query('buscar') buscar?: string) {
    return this.clientesService.obtenerClientes(buscar);
  }
}
