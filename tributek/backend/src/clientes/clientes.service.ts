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

  async obtenerClientes() {
    return this.prisma.db.orm.public.Cliente
      .orderBy((cliente) => cliente.id.desc())
      .all();
  }
}