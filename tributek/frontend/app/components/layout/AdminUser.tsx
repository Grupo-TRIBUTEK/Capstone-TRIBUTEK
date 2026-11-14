"use client";

import { useSyncExternalStore } from "react";
import type { AuthUser } from "@/app/features/auth/auth-client";

const USER_KEY = "tributek_user";

let cachedRaw: string | null | undefined;
let cachedUser: AuthUser | null = null;

function readSnapshot(): AuthUser | null {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(USER_KEY);
  if (Object.is(raw, cachedRaw)) return cachedUser;
  cachedRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }
  try {
    cachedUser = JSON.parse(raw) as AuthUser;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === USER_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getServerSnapshot(): AuthUser | null {
  return null;
}

/** Muestra el usuario autenticado activo en el panel administrativo. */
export default function AdminUser() {
  const user = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  if (!user) return null;
  return (
    <div className="tk-header-user" aria-label="Usuario activo">
      <span className="tk-header-user-status">
        <span className="tk-header-user-dot" aria-hidden="true" />
        Usuario activo
      </span>
      <span className="tk-header-user-name">{user.nombreUsuario}</span>
    </div>
  );
}
