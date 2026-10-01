"use client";

import { useEffect, useSyncExternalStore } from "react";
import Icon, { type IconName } from "../ui/Icon";

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
  const themeIcon: IconName = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor";
  const themes: { value: Theme; label: string; icon: IconName }[] = [
    { value: "light", label: "Claro", icon: "sun" },
    { value: "dark", label: "Oscuro", icon: "moon" },
    { value: "system", label: "Sistema", icon: "monitor" },
  ];
  return (
    <div className={`theme-control${sidebar ? " theme-control-sidebar" : ""}`}>
      <span>Tema</span>
      <details className="theme-select-menu">
        <summary aria-label={`Tema actual: ${themes.find(option => option.value === theme)?.label}`}>
          <Icon name={themeIcon} className="h-4 w-4" />
          {themes.find(option => option.value === theme)?.label}
          <span aria-hidden="true" className="theme-select-chevron" />
        </summary>
        <div className="theme-select-options" role="group" aria-label="Seleccionar tema">
          {themes.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={theme === option.value}
              onClick={event => {
                selectTheme(option.value);
                const menu = event.currentTarget.closest("details");
                if (menu) menu.open = false;
              }}
            >
              <Icon name={option.icon} className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
