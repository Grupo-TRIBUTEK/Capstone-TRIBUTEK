import { describe, expect, it } from 'vitest'
import { formatoRutValido } from './rut.js'
describe('Formato de RUT', () => {
  it.each(['12345678-5', '12.345.678-5', '1234567-K', '1.234.567-k'])('acepta %s', rut => expect(formatoRutValido(rut)).toBe(true))
  it.each(['123456785', '12345678-', '12345678-55', '12345678-KK', '12345678--5', '12345678-A', '12345678- 5', '12.34.5678-5', '', null, 123456785])('rechaza %s', rut => expect(formatoRutValido(rut)).toBe(false))
})
