import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LocalDocumentStorageService } from './document-storage.service.js';

const DEFAULT_DOCUMENT_TYPES = [
  'Boletas de gasto',
  'Compras y ventas',
  'Tributarios',
  'Emitido por TRIBUTEK',
  'Otros antecedentes',
];

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalDocumentStorageService,
  ) {}

  async listar(filters: { buscar?: string; clienteId?: string; periodo?: string; tipo?: string; estado?: string }) {
    const [documentos, clientes, periodos, tipos] = await Promise.all([
      this.prisma.db.orm.public.Documento.orderBy((documento) => documento.id.desc()).all(),
      this.prisma.db.orm.public.Cliente.all(),
      this.prisma.db.orm.public.PeriodoCliente.all(),
      this.prisma.db.orm.public.TipoDocumento.all(),
    ]);
    const clientesPorId = new Map(clientes.map((cliente) => [String(cliente.id), cliente]));
    const periodosPorId = new Map(periodos.map((periodo) => [String(periodo.id), periodo]));
    const tiposPorId = new Map(tipos.map((tipo) => [String(tipo.id), tipo]));

    return documentos.map((documento) => {
      const cliente = clientesPorId.get(String(documento.clienteId));
      const periodo = periodosPorId.get(String(documento.periodoId));
      const tipo = tiposPorId.get(String(documento.tipoDocumentoId));
      return {
        ...documento,
        cliente: cliente ? { id: String(cliente.id), nombreRazonSocial: cliente.nombreRazonSocial } : null,
        tipoDocumento: tipo ? { id: String(tipo.id), nombre: tipo.nombre } : null,
        periodo: periodo ? { id: String(periodo.id), anio: Number(periodo.anio), mes: Number(periodo.mes) } : null,
      };
    }).filter((documento) => this.matchesFilters(documento, filters));
  }

  async cargar(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    data: { clienteId?: string; periodo?: string; tipo?: string; estado?: string; observacion?: string },
    usuarioId: string,
  ) {
    if (!file) throw new BadRequestException('Debes seleccionar un archivo.');
    if (!data.clienteId || !data.periodo || !data.tipo) throw new BadRequestException('Cliente, período y tipo son obligatorios.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('El archivo no puede superar 10 MB.');
    const periodo = this.parsePeriodo(data.periodo);
    const clienteId = BigInt(data.clienteId);
    const cliente = await this.prisma.db.orm.public.Cliente.where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    let periodoCliente = await this.prisma.db.orm.public.PeriodoCliente.where({
      clienteId,
      anio: periodo.anio,
      mes: periodo.mes,
    }).first();
    if (!periodoCliente) {
      periodoCliente = await this.prisma.db.orm.public.PeriodoCliente.create({
        clienteId,
        anio: periodo.anio,
        mes: periodo.mes,
        estadoContable: 'PENDIENTE',
        cerrado: false,
      } as any);
    }

    let tipo = await this.prisma.db.orm.public.TipoDocumento.where({ nombre: data.tipo.trim() } as any).first();
    if (!tipo) {
      tipo = await this.prisma.db.orm.public.TipoDocumento.create({
        nombre: data.tipo.trim(),
        area: 'DOCUMENTOS',
        activo: true,
      } as any);
    }

    const stored = await this.storage.save(file);
    try {
      return await this.prisma.db.orm.public.Documento.create({
        clienteId,
        periodoId: periodoCliente.id,
        tipoDocumentoId: tipo.id,
        cargadoPor: BigInt(usuarioId),
        nombreArchivo: file.originalname,
        urlArchivo: stored.key,
        mimeType: file.mimetype || 'application/octet-stream',
        tamanoBytes: BigInt(file.size),
        estado: data.estado || 'RECIBIDO',
        observacion: data.observacion?.trim() || null,
        visibleCliente: false,
      } as any);
    } catch (error) {
      await this.storage.remove(stored.key);
      throw error;
    }
  }

  async descargar(id: string) {
    const documento = await this.prisma.db.orm.public.Documento.where({ id: BigInt(id) }).first();
    if (!documento) throw new NotFoundException('Documento no encontrado.');
    return { documento, stream: await this.storage.open(documento.urlArchivo) };
  }

  tiposSugeridos() {
    return DEFAULT_DOCUMENT_TYPES;
  }

  private parsePeriodo(value: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      throw new BadRequestException('El período debe tener formato AAAA-MM.');
    }
    return { anio: Number(match[1]), mes: Number(match[2]) };
  }

  private matchesFilters(documento: any, filters: { buscar?: string; clienteId?: string; periodo?: string; tipo?: string; estado?: string }) {
    const periodo = documento.periodo ? `${documento.periodo.anio}-${String(documento.periodo.mes).padStart(2, '0')}` : '';
    const search = filters.buscar?.trim().toLocaleLowerCase();
    return (!filters.clienteId || String(documento.clienteId) === filters.clienteId)
      && (!filters.periodo || periodo === filters.periodo)
      && (!filters.tipo || documento.tipoDocumento?.nombre === filters.tipo)
      && (!filters.estado || documento.estado === filters.estado)
      && (!search || `${documento.nombreArchivo} ${documento.cliente?.nombreRazonSocial ?? ''} ${documento.tipoDocumento?.nombre ?? ''}`.toLocaleLowerCase().includes(search));
  }
}
