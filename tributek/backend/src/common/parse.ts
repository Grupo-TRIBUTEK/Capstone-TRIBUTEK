import { BadRequestException } from '@nestjs/common';
import 'temporal-polyfill/global';

export const ANIO_MIN = 2000;
export const ANIO_MAX = 2099;

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseId(raw: unknown, campo: string): bigint {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new BadRequestException(`${campo} inválido: debe ser un número.`);
  }
  return BigInt(raw);
}

export function parseAnio(raw: unknown): number {
  const anio = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isInteger(anio) || (anio as number) < ANIO_MIN || (anio as number) > ANIO_MAX) {
    throw new BadRequestException(`Año inválido: debe estar entre ${ANIO_MIN} y ${ANIO_MAX}.`);
  }
  return anio as number;
}

export function parseMes(raw: unknown): number {
  const mes = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isInteger(mes) || (mes as number) < 1 || (mes as number) > 12) {
    throw new BadRequestException('Mes inválido: debe ser 1..12.');
  }
  return mes as number;
}

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

export function parseFechaIsoOpcional(raw: unknown, campo: string): Temporal.PlainDate | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return parseFechaIso(raw, campo);
}
