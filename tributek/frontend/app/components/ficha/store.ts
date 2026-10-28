/**
 * Almacén reactivo del navegador: localStorage conserva la copia y React escucha sus cambios. No sustituye la persistencia remota.
 */
"use client";
import { useSyncExternalStore } from "react";
import { mergeClients } from "./mergeClients";
import { emptyData, parseData, type Data } from "./model";
import { validateLedger, type Ledger } from "../management/model";
const KEY = "tributek:ficha-ensayo:v1";
const initial = { data: emptyData, ready: false, error: "" };
let snapshot = initial;
const listeners = new Set<() => void>();
/** Notifica a los componentes suscritos que cambió el registro compartido. */
function emit() {
  listeners.forEach((fn) => fn());
}
/** Lee y valida el almacenamiento local; conserva un mensaje de error si no puede abrirlo. */
function reload() {
  try {
    snapshot = {
      data: validateLedger(parseData(localStorage.getItem(KEY)) as Ledger),
      ready: true,
      error: "",
    };
  } catch {
    snapshot = {
      ...snapshot,
      ready: true,
      error:
        "No se pueden leer los datos de ensayo. No se sobrescribirán. Revisa el almacenamiento de este navegador.",
    };
  }
  emit();
}
/** Actualiza la copia en memoria cuando otra pestaña modifica el almacenamiento. */
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) reload();
}
/** Registra un observador y escucha otras pestañas mientras haya suscriptores; devuelve su limpieza. */
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    window.addEventListener("storage", storage);
    reload();
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) window.removeEventListener("storage", storage);
  };
}
/** Comprueba revisión y disponibilidad antes de escribir localmente. No guarda por sí sola en el servidor. */
export function persist(data: Data, revision: string): Data {
  if (!snapshot.ready || snapshot.error)
    throw new Error("El almacenamiento no está disponible.");
  const current = parseData(localStorage.getItem(KEY));
  if (current.revision !== revision) {
    reload();
    throw new Error(
      "Los datos cambiaron en otra pestaña. Cancela y vuelve a abrir la ficha para revisar la versión actual.",
    );
  }
  const saved = { ...data, revision: crypto.randomUUID() };
  validateLedger(saved as Ledger);
  localStorage.setItem(KEY, JSON.stringify(saved));
  snapshot = { data: saved, ready: true, error: "" };
  emit();
  return saved;
}
/** Devuelve la copia actual en memoria que React debe presentar. */
const getSnapshot = () => snapshot;
/** Entrega el estado inicial estable para la representación del servidor. */
const getServerSnapshot = () => initial;
/** Conecta React con el registro compartido mediante useSyncExternalStore. */
export function useData() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Ajusta el directorio local a los clientes recibidos del servidor. */
export function syncRemoteClients(
  records: import("./mergeClients").RemoteClient[],
): Data {
  if (!snapshot.ready || snapshot.error)
    throw new Error("La ficha local no está disponible.");
  const remoteIds = new Set(records.map((record) => record.id));
  const clients = snapshot.data.clients.filter((client) => remoteIds.has(client.id));
  const months = snapshot.data.months.filter((month) => remoteIds.has(month.clientId));
  const payments = snapshot.data.payments.filter((payment) =>
    remoteIds.has(payment.clientId),
  );
  const pruned =
    clients.length !== snapshot.data.clients.length ||
    months.length !== snapshot.data.months.length ||
    payments.length !== snapshot.data.payments.length;
  const source = pruned ? { ...snapshot.data, clients, months, payments } : snapshot.data;
  const next = mergeClients(source, records);
  if (next !== snapshot.data) persist(next, snapshot.data.revision);
  // Devuelve el ledger vigente: quien llama debe usarlo (y su
  //   revisión) para cualquier escritura posterior, porque la
  //   fusión puede haber persistido y cambiado la revisión.
  return snapshot.data;
}
