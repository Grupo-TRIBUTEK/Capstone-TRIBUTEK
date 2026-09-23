import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import 'temporal-polyfill/global';
import 'temporal-polyfill/types/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto.js';

const esServicioRrhh = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
    .includes('recursos humanos');

@Injectable()
export class RrhhService {
  constructor(private readonly prisma: PrismaService) {}

  async resumenYEmpresas(filtros: {
    buscar?: string;
    clienteId?: string;
    estado?: string;
  }) {
    const [asignaciones, servicios, clientes, trabajadores] = await Promise.all([
      this.prisma.db.orm.public.ClienteServicio.all(),
      this.prisma.db.orm.public.Servicio.all(),
      this.prisma.db.orm.public.Cliente.all(),
      this.prisma.db.orm.public.Trabajador.all(),
    ]);

    const serviciosPorId = new Map(servicios.map((servicio) => [String(servicio.id), servicio]));
    const clientesPorId = new Map(clientes.map((cliente) => [String(cliente.id), cliente]));
    const trabajadoresPorCliente = new Map<string, any[]>();

    for (const trabajador of trabajadores) {
      const key = String(trabajador.clienteId);
      trabajadoresPorCliente.set(key, [...(trabajadoresPorCliente.get(key) ?? []), trabajador]);
    }

    const empresas = asignaciones
      .filter((asignacion) => {
        const servicio = serviciosPorId.get(String(asignacion.servicioId));
        return servicio && esServicioRrhh(String(servicio.nombre));
      })
      .map((asignacion) => {
        const cliente = clientesPorId.get(String(asignacion.clienteId));
        return {
          id: String(asignacion.id),
          estado: asignacion.estado,
          fechaInicio: asignacion.fechaInicio,
          fechaTermino: asignacion.fechaTermino,
          cliente: cliente
            ? {
                id: String(cliente.id),
                rut: cliente.rut,
                nombreRazonSocial: cliente.nombreRazonSocial,
                estado: cliente.estado,
              }
            : null,
          trabajadores: trabajadoresPorCliente.get(String(asignacion.clienteId)) ?? [],
        };
      })
      .filter((empresa) => empresa.cliente);

    const texto = filtros.buscar?.trim().toLocaleLowerCase();
    const filtradas = empresas.filter((empresa) => {
      if (filtros.clienteId && empresa.cliente!.id !== filtros.clienteId) return false;
      if (filtros.estado && empresa.estado !== filtros.estado) return false;
      if (!texto) return true;
      return `${empresa.cliente!.nombreRazonSocial} ${empresa.cliente!.rut} ${empresa.trabajadores.map((trabajador) => `${trabajador.nombre} ${trabajador.rut} ${trabajador.cargo}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(texto);
    });

    return {
      resumen: {
        empresasConServicio: empresas.length,
        trabajadoresRegistrados: empresas.reduce((total, empresa) => total + empresa.trabajadores.length, 0),
        documentosPendientes: 0,
      },
      empresas: filtradas,
    };
  }

  async crearTrabajador(datos: CreateTrabajadorDto) {
    const clienteId = BigInt(datos.clienteId);
    const cliente = await this.prisma.db.orm.public.Cliente.where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Empresa no encontrada.');

    const asignaciones = await this.prisma.db.orm.public.ClienteServicio.where({ clienteId }).all();
    const servicios = await this.prisma.db.orm.public.Servicio.all();
    const serviciosPorId = new Map(servicios.map((servicio) => [String(servicio.id), servicio]));
    const tieneRrhh = asignaciones.some((asignacion) => {
      const servicio = serviciosPorId.get(String(asignacion.servicioId));
      return servicio && esServicioRrhh(String(servicio.nombre));
    });

    if (!tieneRrhh) {
      throw new ConflictException('La empresa no tiene asignado el servicio de Recursos Humanos.');
    }

    const rut = datos.rut.trim();
    const nombre = datos.nombre.trim();
    const cargo = datos.cargo.trim();
    if (!rut || !nombre || !cargo || !datos.fechaIngreso) {
      throw new ConflictException('Completa los antecedentes obligatorios del trabajador.');
    }

    return this.prisma.db.orm.public.Trabajador.create({
      clienteId,
      rut,
      nombre,
      cargo,
      fechaIngreso: Temporal.PlainDate.from(datos.fechaIngreso),
      fechaTermino: datos.fechaTermino ? Temporal.PlainDate.from(datos.fechaTermino) : null,
      estado: datos.estado?.trim() || 'ACTIVO',
    } as any);
  }
}
