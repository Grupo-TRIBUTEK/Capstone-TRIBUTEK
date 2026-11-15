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

export type LoginSuccess = {
  access_token: string;
  usuario: AuthUser;
  mensaje?: string;
};

export type LoginChallenge = {
  requires2FA: true;
  challengeToken: string;
  methods?: ('app' | 'email')[];
  maskedEmail?: string | null;
  mensaje?: string;
};

export type LoginResult = LoginSuccess | LoginChallenge;

export function isLoginChallenge(data: LoginResult): data is LoginChallenge {
  return (data as LoginChallenge).requires2FA === true && typeof (data as LoginChallenge).challengeToken === "string";
}

/** Lee el token de localStorage; se utiliza en el navegador. */
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Elimina token y usuario local para cerrar la sesión en este navegador. */
export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function storeSession(data: LoginSuccess) {
  window.localStorage.setItem(TOKEN_KEY, data.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
}

async function readErrorMessage(response: Response, fallback: string) {
  const errorData = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(errorData?.message) ? errorData.message.join(" ") : errorData?.message;
  return message || fallback;
}

/** Envía credenciales. Si requiere 2FA devuelve desafío sin guardar sesión; si no, guarda sesión. */
export async function login(nombreUsuario: string, password: string): Promise<LoginResult> {
  // Un intento nuevo no debe conservar la sesión de otra cuenta durante el desafío.
  clearAuth();
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreUsuario, password }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Usuario o contraseña incorrectos"));
  }
  const data = (await response.json()) as LoginResult;
  if (!isLoginChallenge(data)) {
    storeSession(data);
  }
  return data;
}

/** Verifica código 2FA con el token de desafío y guarda sesión si es exitoso. */
export async function verifyLogin2fa(challengeToken: string, code: string, method: 'app' | 'email' = 'app'): Promise<LoginSuccess> {
  const response = await fetch("/auth/2fa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code, method }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "No se pudo verificar el código."));
  }
  const data = (await response.json()) as LoginSuccess;
  storeSession(data);
  return data;
}

export async function get2faStatus() {
  const response = await authenticatedFetch("/auth/2fa/status");
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo obtener el estado de 2FA."));
  return (await response.json()) as { enabled: boolean; pending: boolean; emailEnabled: boolean; emailRegistered: boolean; emailDeliveryAvailable: boolean; maskedEmail: string | null };
}

export async function setup2fa(password: string) {
  const response = await authenticatedFetch("/auth/2fa/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo iniciar la configuración de 2FA."));
  return (await response.json()) as { otpauthUrl: string; qrCodeDataUrl: string; secret: string };
}

export async function confirm2fa(code: string) {
  const response = await authenticatedFetch("/auth/2fa/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo confirmar la activación de 2FA."));
  return (await response.json()) as { mensaje?: string; recoveryCodes?: string[]; recoveryCodesNotice?: string };
}

export async function disable2fa(password: string, code: string) {
  const response = await authenticatedFetch("/auth/2fa/disable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, code }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo desactivar 2FA."));
  return (await response.json()) as { mensaje?: string };
}

/** Lee el usuario autenticado almacenado en este navegador. */
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Añade Authorization: Bearer cuando existe token y conserva las otras opciones de fetch. */
export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
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

export async function relink2fa(password: string, recoveryCode: string) {
  const response = await authenticatedFetch("/auth/2fa/relink", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, recoveryCode }),
  })
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo volver a mostrar el QR."))
  return await response.json() as { qrCodeDataUrl: string, secret: string }
}

export async function confirmRelink2fa(code: string) {
  const response = await authenticatedFetch("/auth/2fa/relink/confirm", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo comprobar la vinculación."))
  return await response.json() as { mensaje: string }
}

export async function sendLoginEmailCode(challengeToken: string) {
  const response = await fetch("/auth/2fa/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeToken }) })
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo enviar el código de ingreso."))
  return await response.json() as { mensaje: string, maskedEmail: string }
}
export async function requestMyEmailVerification(password: string) {
  const response = await authenticatedFetch("/auth/2fa/email/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo enviar la verificación."))
  return await response.json() as { mensaje: string, maskedEmail: string }
}
export async function confirmMyEmailVerification(code: string) {
  const response = await authenticatedFetch("/auth/2fa/email/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
  if (!response.ok) throw new Error(await readErrorMessage(response, "No se pudo verificar el correo."))
  return await response.json() as { mensaje: string }
}
