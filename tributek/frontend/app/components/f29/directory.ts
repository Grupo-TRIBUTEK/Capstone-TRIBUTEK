import { normalizeRut, validRut, type Client } from './model';

/** El servidor define la cartera visible; los IDs locales existentes conservan sus proyecciones. */
export function directoryClients(value: unknown, cached: Client[]): Client[] {
  if (!Array.isArray(value)) throw new Error('El directorio de clientes no tiene el formato esperado.');
  const vistos = new Set<string>();
  return value.map(c => {
    if (!c || !['string', 'number'].includes(typeof c.id) || typeof c.nombreRazonSocial !== 'string' || !c.nombreRazonSocial.trim() || typeof c.rut !== 'string' || !validRut(c.rut)) throw new Error('El directorio contiene un cliente inválido.');
    const rut = normalizeRut(c.rut);
    if (vistos.has(rut)) throw new Error('El directorio contiene un RUT duplicado.');
    vistos.add(rut);
    return { id: cached.find(local => normalizeRut(local.rut) === rut)?.id ?? `servidor:${c.id}`, name: c.nombreRazonSocial.trim(), rut };
  });
}
