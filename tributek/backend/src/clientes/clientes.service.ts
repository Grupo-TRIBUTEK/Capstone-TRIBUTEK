// Parte 1: Creacion de la logica de negocio para el modulo de clientes.
// Dto --> cliente.service.ts --> cliente.controller.ts

 // Logica donde crearemos el cliente en la base de datos, 
  // utilizando el DTO para recibir los datos del cliente.
  
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async crearCliente(datos: CreateClienteDto) {
    const clienteData = {
        tipoCliente: datos.tipoCliente,
        rut: datos.rut,
        nombreRazonSocial: datos.nombreRazonSocial,
        contactoPrincipal: datos.contactoPrincipal,
        emailContacto: datos.emailContacto,
        telefono: datos.telefono,
        direccion: datos.direccion,
        estado: datos.estado,
    } as any;

    return this.prisma.db.orm.public.Cliente.create(clienteData);
  }
}