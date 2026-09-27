"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "tributek-theme";
const EVENT = "tributek-theme-change";
let fallback: Theme = "system";

function preference(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return fallback;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
function selectTheme(theme: Theme) {
  fallback = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* Session-only when storage is unavailable. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeManager() {
  const theme = useSyncExternalStore(subscribe, preference, () => "system" as Theme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    }
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

export default function ThemeSelect({ sidebar = false }: { sidebar?: boolean }) {
  const theme = useSyncExternalStore(subscribe, preference, () => "system" as Theme);
  return (
    <label className={`theme-control${sidebar ? " theme-control-sidebar" : ""}`}>
      <span>Tema</span>
      <select aria-label="Tema de la página" value={theme} onChange={e => selectTheme(e.target.value as Theme)}>
        <option value="light">☀️ Claro</option>
        <option value="dark">🌙 Oscuro</option>
        <option value="system">💻 Sistema</option>
      </select>
    </label>
  );
}
