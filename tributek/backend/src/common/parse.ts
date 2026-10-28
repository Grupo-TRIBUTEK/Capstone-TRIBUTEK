/**
 * Validaciones compartidas de IDs y fechas. Centralizarlas mantiene las mismas reglas y mensajes entre servicios.
 */
import { BadRequestException } from '@nestjs/common';
import 'temporal-polyfill/global';

export const ANIO_MIN = 2000;
export const ANIO_MAX = 2099;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Exige un ID decimal escrito como texto y lo convierte a BigInt para consultar PostgreSQL. */
export function parseId(raw: unknown, campo: string): bigint {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new BadRequestException(`${campo} inválido: debe ser un número.`);
  }
  return BigInt(raw);
}

/** Convierte el año recibido y exige un entero entre 2000 y 2099; un valor inválido produce HTTP 400. */
export function parseAnio(raw: unknown): number {
  const anio = typeof raw === 'string' ? Number(raw) : raw;
  if (
    !Number.isInteger(anio) ||
    (anio as number) < ANIO_MIN ||
    (anio as number) > ANIO_MAX
  ) {
    throw new BadRequestException(
      `Año inválido: debe estar entre ${ANIO_MIN} y ${ANIO_MAX}.`,
    );
  }
  return anio as number;
}

/** Convierte el mes recibido y exige un entero entre 1 y 12. */
export function parseMes(raw: unknown): number {
  const mes = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isInteger(mes) || (mes as number) < 1 || (mes as number) > 12) {
    throw new BadRequestException('Mes inválido: debe ser 1..12.');
  }
  return mes as number;
}

/** Exige YYYY-MM-DD y construye una fecha sin hora mediante Temporal; identifica el campo si falla. */
export function parseFechaIso(raw: unknown, campo: string): Temporal.PlainDate {
  if (typeof raw !== 'string' || !FECHA_ISO.test(raw)) {
    throw new BadRequestException(`${campo} inválida: usa el formato YYYY-MM-DD.`);
  }
  try {
    return Temporal.PlainDate.from(raw);
  } catch {
    throw new BadRequestException(`${campo} inválida: "${raw}".`);
  }
}

/** Representa una fecha omitida como null; si hay contenido, aplica la validación de fecha. */
export function parseFechaIsoOpcional(
  raw: unknown,
  campo: string,
): Temporal.PlainDate | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return parseFechaIso(raw, campo);
}
