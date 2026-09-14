import type { Data } from './model';
export type RemoteClient = { id: string; nombreRazonSocial: string; telefono?: string };
export function mergeClients(data: Data, records: RemoteClient[]): Data {
  if (!Array.isArray(records)) throw new Error('La respuesta de clientes no es una lista.');
  const clients = [...data.clients];
  let changed = false;
  const seen = new Set<string>();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id || typeof record.nombreRazonSocial !== 'string' || !record.nombreRazonSocial.trim() || (record.telefono != null && typeof record.telefono !== 'string') || seen.has(record.id)) throw new Error('La respuesta contiene clientes inválidos.');
    seen.add(record.id);
    const index = clients.findIndex(client => client.id === record.id);
    const name = record.nombreRazonSocial;
    const phone = record.telefono ?? '';
    if (index < 0) { clients.push({id:record.id,name,phone,note:'',documentUrl:''}); changed = true; }
    else if (clients[index].name !== name || clients[index].phone !== phone) { clients[index] = {...clients[index],name,phone}; changed = true; }
  }
  if (clients.length > 100) throw new Error('El ensayo admite hasta 100 clientes locales.');
  return changed ? {...data,clients} : data;
}
