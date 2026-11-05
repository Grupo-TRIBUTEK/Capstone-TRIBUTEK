/**
 * Acceso HTTP del asistente separado de su interfaz React; recibe pregunta y ruta y devuelve texto o un error.
 */
import { authenticatedFetch } from "../../features/auth/auth-client";

type ConsultaResponse = { respuesta?: string; message?: string | string[] };

/**
 * Envía una pregunta y la ruta actual al backend con la sesión autenticada.
 * Devuelve solo el texto listo para mostrar. El historial permanece en el componente:
 * este endpoint no recibe las preguntas anteriores ni datos de clientes.
 */
export async function consultarAsistente(consulta: string, contexto: string) {
  const response = await authenticatedFetch("/ia/consultas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consulta, contexto }),
  });
  const data = (await response.json().catch(() => null)) as ConsultaResponse | null;
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
    throw new Error(message || "No se pudo obtener una respuesta. Inténtalo de nuevo.");
  }
  if (!data?.respuesta?.trim())
    throw new Error("El asistente devolvió una respuesta vacía.");
  return data.respuesta.trim();
}

/** Solicita una propuesta acotada a los controles actuales. La respuesta no ejecuta ninguna operación. */
export async function proponerAccion(consulta: string, contexto: string, controles: import('./interfaz').ControlIa[], historial: { role: 'user' | 'assistant', text: string }[] = [], vista = '') {
  const response = await authenticatedFetch('/ia/consultas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consulta, contexto, controles, historial, vista }),
  })
  const data = await response.json().catch(() => null) as { respuesta?: string, accion?: unknown, message?: string | string[] } | null
  if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message.join(' ') : data?.message || 'No se pudo preparar la acción.')
  if (typeof data?.respuesta !== 'string' || !data.respuesta.trim()) throw new Error('El asistente devolvió una respuesta vacía.')
  return { respuesta: data.respuesta.trim(), accion: data.accion }
}
