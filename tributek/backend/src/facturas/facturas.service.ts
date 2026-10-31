/**
 * Lógica de registros de facturación. Aquí se coordinan validaciones y operaciones del módulo.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Numeric, Varchar } from '@prisma/orm-postgres/target/codec-types';
import 'temporal-polyfill/global';
import { parseAnio, parseFechaIsoOpcional, parseId, parseMes } from '../common/parse.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardarFacturaDto } from './dto/guardar-factura.dto.js';

// El codec pg/numeric recibe texto decimal con la escala de la columna.
const num14 = (n: number): Numeric<14, 2> => n.toFixed(2) as Numeric<14, 2>;

// Tipos de factura del formulario (espejo de `Invoice.kind` en
// management/model.ts:38-50).
const TIPOS = ['monthly', 'extra'] as const;

const MONTO_MAX = 999999999;
const NOMBRE_MAX = 180;
const RUT_MAX = 20;
const DESCRIPCION_MAX = 300;
const NUMERO_MAX = 30;
const NOTA_MAX = 1000;

// Shape espejo de `Invoice` (management/model.ts:38-50) — lo que
// consume la vista Facturación.
type FacturaForma = {
  id: string;
  clientId: string;
  period: string;
  kind: string;
  name: string;
  rut: string;
  amount: number;
  description: string;
  number: string;
  date: string;
  note: string;
};

/** Forma AAAA-MM con un mes de dos dígitos para mantener el mismo formato en la API. */
const etiquetaPeriodo = (anio: number, mes: number) =>
  `${anio}-${String(mes).padStart(2, '0')}`;

@Injectable()
export class FacturasService {
  constructor(private readonly prisma: PrismaService) {}

  // QUÉ HACE: lista las facturas del cliente (vista Facturación),
  //   ordenadas por período y id.
  async listar(clienteIdRaw: string) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const cliente = await this.prisma.db.orm.public.Cliente.where({
      id: clienteId,
    }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const facturas = await this.prisma.db.orm.public.Factura.where({ clienteId })
      .orderBy((f) => f.anio.asc())
      .orderBy((f) => f.mes.asc())
      .orderBy((f) => f.id.asc())
      .all();
    return facturas.map((f) => this.formaFactura(f, clienteIdRaw));
  }

  // QUÉ HACE: crea una fila de facturación (espejo de la
  //   validación de `Invoice` en `validateLedger`: tipo del
  //   catálogo, monto entero ≥ 0, descripción obligatoria,
  //   número y fecha juntos o vacíos).
  async guardar(clienteIdRaw: string, data: GuardarFacturaDto) {
    const clienteId = parseId(clienteIdRaw, 'clienteId');
    const { anio, mes, tipo, nombre, rut, amount, descripcion, nota, numero, fecha } =
      this.validarFactura(data);

    const cliente = await this.prisma.db.orm.public.Cliente.where({
      id: clienteId,
    }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const factura = await this.prisma.db.orm.public.Factura.create({
      clienteId,
      anio,
      mes,
      tipo: tipo as Varchar<10>,
      nombre: nombre as Varchar<180>,
      rut: rut as Varchar<20>,
      monto: num14(amount),
      descripcion: descripcion as Varchar<300>,
      numero: numero === null ? null : (numero as Varchar<30>),
      fecha,
      nota: nota === '' ? null : (nota as Varchar<1000>),
      creadoEn: Temporal.Now.instant(),
    });

    return this.formaFactura(factura, clienteIdRaw);
  }

  // QUÉ HACE: validación compartida por crear y editar.
  private validarFactura(data: GuardarFacturaDto): {
    clienteId: bigint | null;
    anio: number;
    mes: number;
    tipo: string;
    nombre: string;
    rut: string;
    amount: number;
    descripcion: string;
    nota: string;
    numero: string | null;
    fecha: Temporal.PlainDate | null;
  } {
    const anio = parseAnio(data.anio);
    const mes = parseMes(data.mes);
    const tipo = this.parseTipo(data.kind);
    const nombre = this.parseTexto(data.name, 'name', NOMBRE_MAX, true);
    const rut = this.parseTexto(data.rut, 'rut', RUT_MAX, true);
    const amount = this.parseMonto(data.amount);
    const descripcion = this.parseTexto(
      data.description,
      'description',
      DESCRIPCION_MAX,
      true,
    );
    const nota = this.parseTexto(data.note, 'note', NOTA_MAX);
    const numero = this.parseTextoOpcional(data.number, 'number', NUMERO_MAX);
    const fecha = parseFechaIsoOpcional(data.date, 'date');
    if (Boolean(numero) !== Boolean(fecha)) {
      throw new BadRequestException('Completa número y fecha de factura juntos.');
    }
    let clienteId: bigint | null = null;
    if (data.clientId !== undefined && data.clientId !== null && data.clientId !== '') {
      clienteId = parseId(data.clientId, 'clientId');
    }
    return {
      clienteId,
      anio,
      mes,
      tipo,
      nombre,
      rut,
      amount,
      descripcion,
      nota,
      numero,
      fecha,
    };
  }

  // QUÉ HACE: edita una factura (espejo del editor de
  //   facturación). El cliente puede cambiar en filas "extra".
  async actualizar(facturaIdRaw: string, data: GuardarFacturaDto) {
    const facturaId = parseId(facturaIdRaw, 'facturaId');
    const {
      clienteId,
      anio,
      mes,
      tipo,
      nombre,
      rut,
      amount,
      descripcion,
      nota,
      numero,
      fecha,
    } = this.validarFactura(data);

    const factura = await this.prisma.db.orm.public.Factura.where({
      id: facturaId,
    }).first();
    if (!factura) throw new NotFoundException('Factura no encontrada.');

    // El cliente de la fila: el del path (creación) o el que
    //   trae el body (edición con cambio de cliente).
    const clienteObjetivo = clienteId ?? factura.clienteId;
    const cliente = await this.prisma.db.orm.public.Cliente.where({
      id: clienteObjetivo,
    }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    await this.prisma.db.orm.public.Factura.where({ id: facturaId }).update({
      clienteId: clienteObjetivo,
      anio,
      mes,
      tipo: tipo as Varchar<10>,
      nombre: nombre as Varchar<180>,
      rut: rut as Varchar<20>,
      monto: num14(amount),
      descripcion: descripcion as Varchar<300>,
      numero: numero === null ? null : (numero as Varchar<30>),
      fecha,
      nota: nota === '' ? null : (nota as Varchar<1000>),
    });

    const actualizado = await this.prisma.db.orm.public.Factura.where({
      id: facturaId,
    }).first();
    if (!actualizado) {
      // Inalcanzable en la práctica: la actualización acabó de escribir la fila.
      throw new NotFoundException('Factura no encontrada.');
    }
    return this.formaFactura(actualizado, String(clienteObjetivo));
  }

  // QUÉ HACE: elimina una factura por id.
  async eliminar(facturaIdRaw: string) {
    const facturaId = parseId(facturaIdRaw, 'facturaId');
    const factura = await this.prisma.db.orm.public.Factura.where({
      id: facturaId,
    }).first();
    if (!factura) throw new NotFoundException('Factura no encontrada.');

    await this.prisma.db.orm.public.Factura.where({ id: facturaId }).delete();
    return { id: facturaIdRaw, deleted: true };
  }

  /** Adapta la fila de PostgreSQL al frontend: ID de texto, período AAAA-MM y monto numérico. */
  private formaFactura(factura: Record<string, any>, clientId: string): FacturaForma {
    return {
      id: String(factura.id),
      clientId,
      period: etiquetaPeriodo(factura.anio, factura.mes),
      kind: factura.tipo,
      name: factura.nombre,
      rut: factura.rut,
      amount: Number(factura.monto),
      description: factura.descripcion,
      number: factura.numero ?? '',
      date: factura.fecha ? String(factura.fecha) : '',
      note: factura.nota ?? '',
    };
  }

  /** Acepta los tipos internos monthly y extra para distinguir facturas mensuales y extraordinarias. */
  private parseTipo(raw: unknown): string {
    if (typeof raw !== 'string' || !(TIPOS as readonly string[]).includes(raw)) {
      throw new BadRequestException(
        `Tipo de factura inválido: "${String(raw)}". Usa "monthly" o "extra".`,
      );
    }
    return raw;
  }

  /** Valida el tipo y largo del texto y aplica las reglas del campo. */
  private parseTexto(
    raw: unknown,
    campo: string,
    max: number,
    obligatorio = false,
  ): string {
    if (raw === undefined || raw === null) return '';
    if (typeof raw !== 'string' || raw.length > max) {
      throw new BadRequestException(
        `El campo "${campo}" admite hasta ${max} caracteres.`,
      );
    }
    const texto = obligatorio ? raw.trim() : raw;
    if (obligatorio && !texto) {
      throw new BadRequestException(`El campo "${campo}" es obligatorio.`);
    }
    return texto;
  }

  /** Representa un texto ausente como null y limita su largo cuando fue enviado. */
  private parseTextoOpcional(raw: unknown, campo: string, max: number): string | null {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string' || raw.length > max) {
      throw new BadRequestException(
        `El campo "${campo}" admite hasta ${max} caracteres.`,
      );
    }
    return raw;
  }

  /** Exige un monto entero no negativo dentro del máximo admitido. */
  private parseMonto(raw: unknown): number {
    if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) {
      throw new BadRequestException('El monto de la factura debe ser un entero ≥ 0.');
    }
    if (raw > MONTO_MAX) {
      throw new BadRequestException(
        'Los montos deben ser pesos enteros entre 0 y 999.999.999.',
      );
    }
    return raw;
  }
}
