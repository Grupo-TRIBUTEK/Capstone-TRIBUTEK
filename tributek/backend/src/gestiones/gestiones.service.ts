import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import 'temporal-polyfill/global';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardarFormalizacionDto } from './dto/guardar-formalizacion.dto.js';

// Catálogo fijo de la vista Formalizaciones (espejo de `management/model.ts:50-62`).
// QUÉ HACE: única fuente de verdad del backend para validar y ordenar los pasos.
// EVITAR: agregar/quitar pasos aquí sin cambiar también `model.ts` (se desincronizan).
const CATALOGO_PASOS = [
  'Reunión inicial',
  'Estatutos',
  'Verificación del representante legal',
  'Inicio de actividades',
  'Clave tributaria',
  'e-RUT',
  'Inscripción en boleta electrónica',
  'Inscripción en facturador electrónico',
  'Modelo de emisión de boletas',
  'Banco',
  'Verificación de actividades',
] as const;

// 4 estados permitidos por paso (espejo de `management/model.ts:63-68`).
const ESTADOS_PASO = ['Pendiente', 'En proceso', 'Completado', 'No corresponde'] as const;

// Discriminador de fila: cabecera y pasos llevan el mismo tipo.
// (Cast a `Varchar<N>`: el contrato tipa cada columna por su largo — patrón de `clientes.service.ts`.)
const TIPO_FORMALIZACION = 'Formalización' as Varchar<80>;
const TITULO_FORMALIZACION = 'Formalización' as Varchar<180>;

const NOTA_MAX = 1000;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type PasoValidado = { name: string; state: string; fecha: Temporal.PlainDate | null };

@Injectable()
export class GestionesService {
  constructor(private readonly prisma: PrismaService) {}

  // QUÉ HACE: devuelve `{ steps, note }` del checklist del cliente; vacío si no existe.
  // ESTRUCTURA: cabecera (`parent_id IS NULL`, nota en `descripcion`) + pasos hijos
  //   ordenados por la columna `orden` (1..11, orden del catálogo).
  async obtenerFormalizacion(clienteIdRaw: string) {
    const clienteId = this.parseClienteId(clienteIdRaw);
    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    return this.leerChecklist(clienteId);
  }

  // QUÉ HACE: reemplazo total del checklist en una transacción — borra la cabecera
  //   existente (los 11 pasos caen por `ON DELETE CASCADE`) y crea cabecera + 11 pasos
  //   con `orden` 1..11 según el catálogo.
  // REGLA: una formalización por cliente (supuesto de `formalizaciones.md` §9).
  async guardarFormalizacion(
    clienteIdRaw: string,
    data: GuardarFormalizacionDto,
    usuarioId: string,
  ) {
    const clienteId = this.parseClienteId(clienteIdRaw);
    const cliente = await this.prisma.db.orm.public.Cliente
      .where({ id: clienteId }).first();
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const { pasos, nota } = this.validarBody(data);
    const estadoCabecera = pasos.every(
      (p) => p.state === 'Completado' || p.state === 'No corresponde',
    )
      ? 'Completado'
      : 'En proceso';
    const creador = BigInt(usuarioId);

    await this.prisma.db.transaction(async (tx) => {
      // Solo cabeceras de ESTE cliente y tipo; los hijos se borran en cascada.
      const anteriores = await tx.orm.public.Gestion
        .where({ clienteId, tipo: TIPO_FORMALIZACION })
        .where((g) => g.parentId.isNull())
        .all();
      for (const cabecera of anteriores) {
        await tx.orm.public.Gestion.where({ id: cabecera.id }).delete();
      }


      const cabecera = await tx.orm.public.Gestion.create({
        clienteId,
        titulo: TITULO_FORMALIZACION,
        tipo: TIPO_FORMALIZACION,
        estado: estadoCabecera as Varchar<30>,
        descripcion: (nota || null) as Varchar<1000> | null,
        visibleCliente: true,
        creadoPor: creador,
        creadoEn: Temporal.Now.instant(),
        parentId: null,
        orden: null,
        fecha: null,
      });

      // Siempre escribimos los 11 pasos del catálogo (el body ya validó que están).
      const porNombre = new Map(pasos.map((p) => [p.name, p]));
      for (let i = 0; i < CATALOGO_PASOS.length; i++) {
        const nombre = CATALOGO_PASOS[i]!;
        const dato = porNombre.get(nombre)!;
        await tx.orm.public.Gestion.create({
          clienteId,
          titulo: nombre as Varchar<180>,
          tipo: TIPO_FORMALIZACION,
          estado: dato.state as Varchar<30>,
          fecha: dato.fecha,
          orden: i + 1,
          descripcion: null,
          visibleCliente: true,
          creadoPor: creador,
          creadoEn: Temporal.Now.instant(),
          parentId: cabecera.id,
        });
      }
    });

    return this.leerChecklist(clienteId);
  }

  // QUÉ HACE: listado genérico de filas de `gestiones` con filtros opcionales;
  //   alimenta la tabla de progreso de todos los clientes (y vistas futuras).
  async listar(filters: { clienteId?: string; tipo?: string }) {
    let query = this.prisma.db.orm.public.Gestion;
    if (filters.clienteId) {
      query = query.where({ clienteId: this.parseClienteId(filters.clienteId) });
    }
    if (filters.tipo) {
      if (filters.tipo.length > 80) {
        throw new BadRequestException('El filtro "tipo" no puede superar 80 caracteres.');
      }
      query = query.where({ tipo: filters.tipo as Varchar<80> });
    }
    // Orden del catálogo (1..11): la tabla de Formalizaciones toma el primer
    // no-completado como "próximo paso", así que el array debe venir en orden ascendente.
    return query.orderBy((g) => g.orden.asc()).orderBy((g) => g.id.asc()).all();
  }

  private async leerChecklist(clienteId: bigint) {
    const cabecera = await this.prisma.db.orm.public.Gestion
      .where({ clienteId, tipo: TIPO_FORMALIZACION })
      .where((g) => g.parentId.isNull())
      .orderBy((g) => g.id.desc())
      .first();
    if (!cabecera) {
      return { steps: [] as Array<{ name: string; state: string; date: string }>, note: '' };
    }

    const pasos = await this.prisma.db.orm.public.Gestion
      .where({ parentId: cabecera.id })
      .orderBy((g) => g.orden.asc())
      .all();

    return {
      steps: pasos.map((p) => ({
        name: p.titulo,
        state: p.estado,
        date: p.fecha ? String(p.fecha) : '',
      })),
      note: cabecera.descripcion ?? '',
    };
  }

  // QUÉ HACE: valida el body del PUT según las reglas de `formalizaciones.md` §5.
  // REGLAS: exactamente los 11 pasos del catálogo (sin repetir), estado ∈ los 4,
  //   fecha `YYYY-MM-DD` o vacía, nota ≤ 1000.
  private validarBody(data: GuardarFormalizacionDto): {
    pasos: PasoValidado[];
    nota: string;
  } {
    if (!data || !Array.isArray(data.steps)) {
      throw new BadRequestException('El body debe incluir "steps" como lista de pasos.');
    }
    if (data.note !== undefined && data.note !== null && typeof data.note !== 'string') {
      throw new BadRequestException('El campo "note" debe ser texto.');
    }
    const nota = (data.note ?? '').trim();
    if (nota.length > NOTA_MAX) {
      throw new BadRequestException(`La nota no puede superar ${NOTA_MAX} caracteres.`);
    }
    if (data.steps.length !== CATALOGO_PASOS.length) {
      throw new BadRequestException(
        `El checklist debe enviar exactamente los ${CATALOGO_PASOS.length} pasos del catálogo.`,
      );
    }

    const vistos = new Set<string>();
    const pasos: PasoValidado[] = data.steps.map((paso) => {
      if (typeof paso?.name !== 'string' || !(CATALOGO_PASOS as readonly string[]).includes(paso.name)) {
        throw new BadRequestException(`Paso desconocido: "${paso?.name ?? ''}".`);
      }
      if (vistos.has(paso.name)) {
        throw new BadRequestException(`Paso repetido: "${paso.name}".`);
      }
      vistos.add(paso.name);

      if (typeof paso?.state !== 'string' || !(ESTADOS_PASO as readonly string[]).includes(paso.state)) {
        throw new BadRequestException(
          `Estado inválido en "${paso.name}": debe ser uno de ${ESTADOS_PASO.join(', ')}.`,
        );
      }
      return { name: paso.name, state: paso.state, fecha: this.parseFecha(paso.date, paso.name) };
    });

    return { pasos, nota };
  }

  private parseFecha(valor: unknown, nombrePaso: string): Temporal.PlainDate | null {
    if (valor === undefined || valor === null || valor === '') return null;
    if (typeof valor !== 'string' || !FECHA_REGEX.test(valor)) {
      throw new BadRequestException(
        `Fecha inválida en "${nombrePaso}": usa el formato YYYY-MM-DD o vacío.`,
      );
    }
    try {
      return Temporal.PlainDate.from(valor);
    } catch {
      throw new BadRequestException(`Fecha inválida en "${nombrePaso}": "${valor}".`);
    }
  }

  private parseClienteId(raw: string): bigint {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
      throw new BadRequestException('clienteId inválido: debe ser un número.');
    }
    return BigInt(raw);
  }
}

