import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import 'temporal-polyfill/global';
import 'temporal-polyfill/types/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAsignacionServicioDto } from './dto/create-asignacion-servicio.dto.js';
import { CreateServicioDto } from './dto/create-servicio.dto.js';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerServicios(buscar?: string) {
    const textoBusqueda = buscar?.trim();
    const servicios = await this.prisma.db.orm.public.Servicio.orderBy((servicio) =>
      servicio.id.desc(),
    ).all();

    if (!textoBusqueda) return servicios;

    return servicios.filter((servicio) =>
      `${servicio.nombre} ${servicio.descripcion ?? ''}`
        .toLocaleLowerCase()
        .includes(textoBusqueda.toLocaleLowerCase()),
    );
  }

  async crearServicio(datos: CreateServicioDto) {
    const nombre = datos.nombre.trim();
    if (!nombre) throw new ConflictException('El nombre del servicio es obligatorio.');

    return this.prisma.db.orm.public.Servicio.create({
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      activo: datos.activo ?? true,
    } as any);
  }

  async actualizarServicio(id: string, datos: CreateServicioDto) {
    const nombre = datos.nombre.trim();
    if (!nombre) throw new ConflictException('El nombre del servicio es obligatorio.');

    const servicio = await this.prisma.db.orm.public.Servicio.where({ id: BigInt(id) }).first();
    if (!servicio) throw new NotFoundException('Servicio no encontrado.');

    return this.prisma.db.orm.public.Servicio.where({ id: BigInt(id) }).update({
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      activo: datos.activo ?? servicio.activo,
    } as any);
  }

  async obtenerAsignaciones() {
    const [asignaciones, servicios, clientes] = await Promise.all([
      this.prisma.db.orm.public.ClienteServicio.orderBy((asignacion) =>
        asignacion.id.desc(),
      ).all(),
      this.prisma.db.orm.public.Servicio.all(),
      this.prisma.db.orm.public.Cliente.all(),
    ]);

    const serviciosPorId = new Map(servicios.map((servicio) => [String(servicio.id), servicio]));
    const clientesPorId = new Map(clientes.map((cliente) => [String(cliente.id), cliente]));

    return asignaciones.map((asignacion) => ({
      ...asignacion,
      servicio: serviciosPorId.get(String(asignacion.servicioId)) ?? null,
      cliente: clientesPorId.get(String(asignacion.clienteId) ?? '') ?? null,
    }));
  }

  async crearAsignacion(datos: CreateAsignacionServicioDto) {
    await this.validarReferencias(datos.clienteId, datos.servicioId);
    const existente = await this.prisma.db.orm.public.ClienteServicio
      .where({
        clienteId: BigInt(datos.clienteId),
        servicioId: BigInt(datos.servicioId),
      })
      .first();

    if (existente) {
      throw new ConflictException('El servicio ya está asociado a este cliente.');
    }

    return this.prisma.db.orm.public.ClienteServicio.create({
      clienteId: BigInt(datos.clienteId),
      servicioId: BigInt(datos.servicioId),
      fechaInicio: datos.fechaInicio ? Temporal.PlainDate.from(datos.fechaInicio) : null,
      fechaTermino: datos.fechaTermino ? Temporal.PlainDate.from(datos.fechaTermino) : null,
      estado: datos.estado,
    } as any);
  }

  async actualizarAsignacion(id: string, datos: CreateAsignacionServicioDto) {
    await this.validarReferencias(datos.clienteId, datos.servicioId);
    const asignacion = await this.prisma.db.orm.public.ClienteServicio.where({
      id: BigInt(id),
    }).first();
    if (!asignacion) throw new NotFoundException('Asignación no encontrada.');

    return this.prisma.db.orm.public.ClienteServicio.where({ id: BigInt(id) }).update({
      clienteId: BigInt(datos.clienteId),
      servicioId: BigInt(datos.servicioId),
      fechaInicio: datos.fechaInicio ? Temporal.PlainDate.from(datos.fechaInicio) : null,
      fechaTermino: datos.fechaTermino ? Temporal.PlainDate.from(datos.fechaTermino) : null,
      estado: datos.estado,
    } as any);
  }

  async finalizarAsignacion(id: string) {
    const asignacion = await this.prisma.db.orm.public.ClienteServicio.where({
      id: BigInt(id),
    }).first();
    if (!asignacion) throw new NotFoundException('Asignación no encontrada.');

    return this.prisma.db.orm.public.ClienteServicio.where({ id: BigInt(id) }).update({
      estado: 'FINALIZADO',
      fechaTermino: Temporal.Now.plainDateISO('America/Santiago'),
    } as any);
  }

  private async validarReferencias(clienteId: string, servicioId: string) {
    const [cliente, servicio] = await Promise.all([
      this.prisma.db.orm.public.Cliente.where({ id: BigInt(clienteId) }).first(),
      this.prisma.db.orm.public.Servicio.where({ id: BigInt(servicioId) }).first(),
    ]);

    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (!servicio) throw new NotFoundException('Servicio no encontrado.');
  }
}
