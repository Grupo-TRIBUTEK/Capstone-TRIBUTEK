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

  async obtenerClientes(buscar?: string) {
    const textoBusqueda = buscar?.trim();

    const baseQuery = this.prisma.db.orm.public.Cliente.orderBy((cliente) =>
      cliente.id.desc(),
    );

    if (!textoBusqueda) {
      return baseQuery.all();
    }

    const porNombre = await baseQuery
      .where((cliente) => cliente.nombreRazonSocial.ilike(`%${textoBusqueda}%`))
      .all();

    const porRut = await baseQuery
      .where((cliente) => cliente.rut.ilike(`%${textoBusqueda}%`))
      .all();

    const clientesUnicos = new Map<string, any>();

    for (const cliente of [...porNombre, ...porRut]) {
      clientesUnicos.set(String(cliente.id), cliente);
    }

    return [...clientesUnicos.values()].sort((a, b) => Number(b.id) - Number(a.id));
  }
}
