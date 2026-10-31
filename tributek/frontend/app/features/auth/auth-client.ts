/**
 * Sesión del navegador y solicitudes autenticadas. El backend sigue siendo responsable de autorizar cada operación.
 */
const TOKEN_KEY = "tributek_access_token";
const USER_KEY = "tributek_user";

export type AuthUser = {
  id: string;
  nombreUsuario: string;
  rolId: string;
  rolNombre?: string;
};

type LoginResponse = {
  access_token: string;
  usuario: AuthUser;
};

/** Lee el token de localStorage; se utiliza en el navegador. */
export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Elimina token y usuario local para cerrar la sesión en este navegador. */
export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** Envía credenciales, interpreta errores y conserva la sesión recibida. */
export async function login(nombreUsuario: string, password: string) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreUsuario, password }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(errorData?.message)
      ? errorData.message.join(" ")
      : errorData?.message;
    throw new Error(message || "Usuario o contraseña incorrectos");
  }

  const data = (await response.json()) as LoginResponse;
  window.localStorage.setItem(TOKEN_KEY, data.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
  return data;
}

/** Añade Authorization: Bearer cuando existe token y conserva las otras opciones de fetch. */
export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, { ...init, headers });
}

/** Comprueba sesión y permiso administrativo mediante el backend y limpia credenciales si fallan. */
export async function validateAdminAccess() {
  const profileResponse = await authenticatedFetch("/auth/perfil");

  if (!profileResponse.ok) {
    clearAuth();
    return false;
  }

  const adminResponse = await authenticatedFetch("/auth/admin");

  if (!adminResponse.ok) {
    clearAuth();
    return false;
  }

  return true;
}
