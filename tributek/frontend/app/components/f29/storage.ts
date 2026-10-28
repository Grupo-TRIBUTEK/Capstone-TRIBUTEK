/**
 * Respaldo F29 y referencia a la carpeta de CSV en el navegador: localStorage e IndexedDB tienen responsabilidades distintas.
 */
import { emptyDatabase, validateDatabase, type Database } from "./model";
export const KEY = "tributek:f29:v1";
/** Lee y valida el respaldo F29 de localStorage o devuelve la base vacía. */
export function readDatabase(): Database {
  const raw = localStorage.getItem(KEY);
  return raw ? validateDatabase(JSON.parse(raw)) : emptyDatabase;
}
/** Detecta cambios de otra pestaña por revisión y guarda una nueva copia local validada. Esto no confirma persistencia en PostgreSQL. */
export function writeDatabase(next: Database, revision: string): Database {
  if (readDatabase().revision !== revision)
    throw new Error(
      "F29 cambió en otra pestaña. Recarga la página antes de seguir editando.",
    );
  const saved = validateDatabase({ ...next, revision: crypto.randomUUID() });
  localStorage.setItem(KEY, JSON.stringify(saved));
  return saved;
}
type Directory = FileSystemDirectoryHandle & {
  values(): AsyncIterable<FileSystemFileHandle | Directory>;
  queryPermission(options: { mode: "read" }): Promise<PermissionState>;
  requestPermission(options: { mode: "read" }): Promise<PermissionState>;
};
type FolderWindow = Window & {
  showDirectoryPicker?: (options: { mode: "read" }) => Promise<Directory>;
};
/** Abre IndexedDB y crea el almacén de la referencia a la carpeta RCV. */
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("tributek-f29-folder", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("folder");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
/** Recupera la referencia a la carpeta elegida anteriormente. */
async function remembered(): Promise<Directory | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("folder");
    const request = tx.objectStore("folder").get("rcv");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
  });
}
/** Solicita o reutiliza una carpeta autorizada y recopila CSV; devuelve null si falta la API del selector. */
export async function folderFiles(choose = false): Promise<{
  name: string;
  files: File[];
} | null> {
  const picker = (window as FolderWindow).showDirectoryPicker;
  if (!picker) return null;
  let handle = choose ? undefined : await remembered();
  if (!handle) {
    handle = await picker({ mode: "read" });
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("folder", "readwrite");
      tx.objectStore("folder").put(handle, "rcv");
      tx.oncomplete = () => {
        database.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
  if (
    (await handle.queryPermission({ mode: "read" })) !== "granted" &&
    (await handle.requestPermission({ mode: "read" })) !== "granted"
  )
    throw new Error("No se autorizó la lectura de la carpeta RCV.");
  const files: File[] = [];
  /** Recorre subcarpetas hasta la profundidad permitida y reúne archivos CSV. */
  async function visit(dir: Directory, depth: number) {
    if (depth > 3) return;
    for await (const entry of dir.values()) {
      if (entry.kind === "directory") await visit(entry as Directory, depth + 1);
      else if (/\.csv$/i.test(entry.name))
        files.push(await (entry as FileSystemFileHandle).getFile());
      if (files.length > 2000)
        throw new Error("Selecciona una carpeta con menos de 2.000 CSV.");
    }
  }
  await visit(handle, 0);
  return { name: handle.name, files };
}
