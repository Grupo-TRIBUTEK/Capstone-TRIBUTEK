/** Exige guion y un único dígito verificador. Los puntos son opcionales, en grupos completos. */
export const RUT_FORMATO = /^(?:[0-9]{7,8}|[0-9]{1,2}\.[0-9]{3}\.[0-9]{3})-[0-9Kk]$/
export const RUT_MENSAJE = 'Ingresa el RUT con guion y un solo dígito del 0 al 9 o K después, por ejemplo 12345678-5 o 12.345.678-5.'
export function formatoRutValido(value: unknown): value is string {
  return typeof value === 'string' && RUT_FORMATO.test(value.trim())
}
