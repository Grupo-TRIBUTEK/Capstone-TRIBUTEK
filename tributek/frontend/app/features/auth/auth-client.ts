const TOKEN_KEY = "tributek_access_token";
const USER_KEY = "tributek_user";

export type AuthUser = {
  id: string;
  nombreUsuario: string;
  rolId: string;
};

type LoginResponse = {
  access_token: string;
  usuario: AuthUser;
};

export function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const storedUser = window.localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function login(nombreUsuario: string, password: string) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreUsuario, password }),
  });

  if (!response.ok) {
    throw new Error("Usuario o contraseña incorrectos");
  }

  const data = (await response.json()) as LoginResponse;
  window.localStorage.setItem(TOKEN_KEY, data.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
  return data;
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(path, { ...init, headers });
}

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