"use client";

import { useSyncExternalStore } from "react";
import "./featured-client.css";

const key = "tributek:cliente-destacado:v1";
const event = "tributek:cliente-destacado";
let fallback = "";
const normalize = (rut: string) => rut.replace(/[.\s]/g, "").toUpperCase();
function snapshot() {
  try { return window.localStorage.getItem(key) ?? ""; }
  catch { return fallback; }
}
function subscribe(notify: () => void) {
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === key) notify(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(event, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(event, notify);
  };
}
function write(rut: string, only: boolean) {
  fallback = `${rut}|${rut && only ? "1" : "0"}`;
  try { window.localStorage.setItem(key, fallback); } catch { /* Mantener la selección durante esta sesión. */ }
  window.dispatchEvent(new Event(event));
}

/** Preferencia visual local compartida por RUT, también para los IDs locales de F29. */
export function useFeaturedClient() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "");
  const [rut = "", flag] = value.split("|");
  const only = !!rut && flag === "1";
  const isFeatured = (candidate: string) => !!rut && normalize(candidate) === rut;
  return {
    rut, only, isFeatured,
    toggle: (candidate: string) => write(isFeatured(candidate) ? "" : normalize(candidate), only),
    setOnly: (next: boolean) => write(rut, next),
  };
}

export function FeaturedBadge() {
  return <span className="tk-featured-badge">Cliente destacado</span>;
}

export function FeaturedStar({ rut, name }: { rut: string; name: string }) {
  const { isFeatured, toggle } = useFeaturedClient();
  const selected = isFeatured(rut);
  const label = `${selected ? "Quitar destacado de" : "Destacar a"} ${name}`;
  return <button type="button" className="tk-featured-star" aria-pressed={selected} aria-label={label} title={label} disabled={!rut} onClick={() => toggle(rut)}>
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill={selected ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91Z" /></svg>
  </button>;
}

export function FeaturedFilter() {
  const { rut, only, setOnly } = useFeaturedClient();
  return <div className="tk-featured-filter">
    <button type="button" aria-pressed={only} disabled={!rut} onClick={() => setOnly(!only)}>{only ? "Mostrar todos" : "Solo destacado"}</button>
    <span>{only ? "Mostrando solo el destacado; se mantienen los demás filtros." : rut ? "El cliente destacado aparece primero." : "Pulsa una estrella para destacar a un cliente."}</span>
  </div>;
}
