import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyDatabase, newProjection, validRut, validateDatabase } from '../../frontend/app/components/f29/model.js';
import { directoryClients } from '../../frontend/app/components/f29/directory.js';
import { folderFiles, rememberFilesSelection, restoreFolder } from '../../frontend/app/components/f29/storage.js';

afterEach(() => vi.unstubAllGlobals());
describe('Directorio real de F29', () => {
  const remote = [{ id: '42', nombreRazonSocial: 'Camila Fuentes', rut: '17842693-1' }];
  it('muestra los clientes nuevos sin importación manual y conserva el ID de sus proyecciones', () => {
    expect(directoryClients(remote, [])).toEqual([{ id: 'servidor:42', name: 'Camila Fuentes', rut: '17842693-1' }]);
    const cached = [{ id: 'proyeccion-local', name: 'Nombre anterior', rut: '17.842.693-1' }, { id: 'antiguo', name: 'Eliminado', rut: '16473852-3' }];
    expect(directoryClients(remote, cached)).toEqual([{ id: 'proyeccion-local', name: 'Camila Fuentes', rut: '17842693-1' }]);
    expect(cached).toHaveLength(2);
  });
  it('muestra toda la cartera cuando los clientes nuevos tienen un dígito por revisar y no tienen RCV', () => {
    const nuevos = [
      { id: '43', nombreRazonSocial: 'Cliente nuevo uno', rut: '17842693-2' },
      { id: '44', nombreRazonSocial: 'Cliente nuevo dos', rut: '16473852-4' },
    ];
    expect(nuevos.every(c => !validRut(c.rut))).toBe(true);
    const clients = directoryClients([...remote, ...nuevos], []);
    expect(clients.map(c => c.id)).toEqual(['servidor:42', 'servidor:43', 'servidor:44']);
    const projection = newProjection(clients[1].id, '2026-11');
    const saved = validateDatabase({ ...emptyDatabase, clients, projections: [projection] });
    expect(saved.projections[0].sales).toBeUndefined();
    expect(saved.projections[0].purchases).toBeUndefined();
    expect(directoryClients([...remote, ...nuevos], saved.clients)).toEqual(clients);
  });
  it('mantiene la validación de formato y del respaldo sin modificar el RUT recibido', () => {
    expect(() => directoryClients([{ ...remote[0], rut: 'sin-rut' }], [])).toThrow('inválido');
    expect(() => validateDatabase({ ...emptyDatabase, clients: [{ id: 'x', name: 'Cliente', rut: 'sin-rut' }] })).toThrow('inválido');
    expect(directoryClients([{ ...remote[0], rut: '17.842.693-2' }], [])[0].rut).toBe('17842693-2');
  });
  it('no sustituye un fallo del servidor por una cartera local ficticia', () => {
    expect(() => directoryClients({ error: 'Sin conexión' }, [])).toThrow();
    expect(directoryClients([], [{ id: 'antiguo', name: 'Camila', rut: '17842693-1' }])).toEqual([]);
    expect(() => directoryClients([...remote, ...remote], [])).toThrow('duplicado');
  });
});

// Almacén de prueba que conserva datos entre llamadas y emite los eventos de las transacciones.
function navegador() {
  const values = new Map<string, unknown>();
  const indexedDB = { open: () => {
    const request: Record<string, unknown> = { result: { createObjectStore: vi.fn(), close: vi.fn(), transaction: () => {
      const tx: Record<string, unknown> = { objectStore: () => ({
        get: (key: string) => { const get: Record<string, unknown> = {}; queueMicrotask(() => { get.result = values.get(key); (get.onsuccess as (() => void))?.(); (tx.oncomplete as (() => void))?.(); }); return get; },
        put: (value: unknown, key: string) => { values.set(key, value); queueMicrotask(() => (tx.oncomplete as (() => void))?.()); },
      }) }; return tx;
    } } };
    queueMicrotask(() => (request.onsuccess as (() => void))?.()); return request;
  } };
  const window: Record<string, unknown> = {};
  vi.stubGlobal('indexedDB', indexedDB); vi.stubGlobal('window', window);
  return { values, window };
}
describe('Carpeta RCV recordada', () => {
  it('recupera los archivos seleccionados en navegadores sin selector persistente', async () => {
    navegador();
    const file = new File(['Tipo Doc;Monto Total\n33;119000'], 'RCV_VENTA_17842693-1_202610.csv');
    await rememberFilesSelection('RCV octubre', [file]);
    const restored = await restoreFolder();
    expect(restored?.name).toContain('RCV octubre');
    expect(restored?.source).toBe('files');
    expect(await restored?.files[0]?.text()).toContain('119000');
    expect(restored?.needsPermission).toBe(false);
  });
  it('recuerda la carpeta sin abrir un permiso de forma automática', async () => {
    const { values, window } = navegador();
    const requestPermission = vi.fn();
    window.showDirectoryPicker = vi.fn();
    values.set('rcv', { name: 'Carpeta guardada', queryPermission: async () => 'prompt', requestPermission });
    expect(await restoreFolder()).toMatchObject({ name: 'Carpeta guardada', needsPermission: true, files: [] });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(window.showDirectoryPicker).not.toHaveBeenCalled();
  });
  it('reutiliza una carpeta autorizada y vuelve a leer los CSV actuales', async () => {
    const { values, window } = navegador();
    const file = new File(['actualizado'], 'compras.csv');
    const handle = { name: 'RCV', queryPermission: async () => 'granted', values: async function* () { yield { kind: 'file', name: file.name, getFile: async () => file }; } };
    values.set('rcv', handle); window.showDirectoryPicker = vi.fn();
    expect((await folderFiles(false))?.files[0]).toBe(file);
    expect((await restoreFolder())?.files[0]).toBe(file);
    expect(window.showDirectoryPicker).not.toHaveBeenCalled();
  });
  it('no reemplaza la selección anterior si la caché nueva excede el límite', async () => {
    const { values } = navegador(); values.set('selection', { name: 'Conservar', files: [] });
    await expect(rememberFilesSelection('Grande', [{ size: 51 * 1024 * 1024 } as File])).rejects.toThrow('50 MB');
    expect(values.get('selection')).toEqual({ name: 'Conservar', files: [] });
  });
});
