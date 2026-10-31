/** Regresión de validaciones compartidas; no requiere PostgreSQL. */
import { describe, expect, it } from 'vitest';
import { parseAnio, parseMes, parseId } from './parse.js';
describe('validaciones compartidas de período', () => {
  it('conserva los límites inclusivos del año y acepta texto', () => {
    expect(parseAnio('2000')).toBe(2000);
    expect(parseAnio(2099)).toBe(2099);
    for (const value of [1999, 2100, 2026.5, '', undefined, NaN])
      expect(() => parseAnio(value)).toThrow('Año inválido: debe estar entre 2000 y 2099.');
  });
  it('acepta meses extremos y rechaza fracciones y valores fuera de rango', () => {
    expect(parseMes('01')).toBe(1);
    expect(parseMes(12)).toBe(12);
    for (const value of [0, 13, 1.5, '', null, undefined])
      expect(() => parseMes(value)).toThrow('Mes inválido: debe ser 1..12.');
  });
  it('preserva precisión de IDs grandes y rechaza valores no decimales', () => {
    expect(parseId('9007199254740993', 'clienteId')).toBe(9007199254740993n);
    for (const value of [12, '-1', '1.5', '', 'abc', undefined])
      expect(() => parseId(value, 'clienteId')).toThrow('clienteId inválido: debe ser un número.');
  });
});
