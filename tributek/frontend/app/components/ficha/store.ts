"use client";
import { useSyncExternalStore } from "react";
import { mergeClients } from "./mergeClients";
import { emptyData, parseData, type Data } from "./model";
import { validateLedger, type Ledger } from "../management/model";
const KEY = "tributek:ficha-ensayo:v1";
const initial = { data: emptyData, ready: false, error: "" };
let snapshot = initial;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
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
function storage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) reload();
}
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
export function persist(data: Data, revision: string) {
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
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => initial;
export function useData() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function syncRemoteClients(records: import('./mergeClients').RemoteClient[]) {
  if (!snapshot.ready || snapshot.error) throw new Error('La ficha local no está disponible.');
  const remoteIds = new Set(records.map((record) => record.id));
  const clients = snapshot.data.clients.filter((client) => remoteIds.has(client.id));
  const months = snapshot.data.months.filter((month) => remoteIds.has(month.clientId));
  const payments = snapshot.data.payments.filter((payment) => remoteIds.has(payment.clientId));
  const pruned = clients.length !== snapshot.data.clients.length
    || months.length !== snapshot.data.months.length
    || payments.length !== snapshot.data.payments.length;
  const source = pruned ? { ...snapshot.data, clients, months, payments } : snapshot.data;
  const next = mergeClients(source, records);
  if (next !== snapshot.data) persist(next, snapshot.data.revision);
}

