/**
 * Interfaz IaAssistant. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, authenticatedFetch, validateAdminAccess } from "@/app/features/auth/auth-client";
import { proponerAccion } from "./ia/consultar"
import { capturarInterfaz, comprobarDestino, ejecutarControl, validarPropuesta } from "./ia/interfaz"
import { useDialogs } from "./ui/DialogProvider"

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

/** Mantiene el chat visual en memoria. Envía la pregunta, ruta y etiquetas de controles visibles. Las acciones requieren confirmación y una sesión válida. */
export default function IaAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const dialogs = useDialogs()
  const rutaActual = useRef(pathname)
  rutaActual.current = pathname
  const ocupado = useRef(false)
  const [hasSession, setHasSession] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()));
  }, []);

  if (!hasSession) return null;

  /** Evita envíos vacíos o simultáneos y muestra la respuesta o el error sin cerrar el chat. */
  async function sendConsulta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = consulta.trim();
    if (!question || ocupado.current) return
    ocupado.current = true
    const ruta = pathname
    const vence = Date.now() + 120000
    const token = getAccessToken()
    const captura = capturarInterfaz()
    const vigente = () => {
      if (Date.now() > vence || !token || token !== getAccessToken() || rutaActual.current !== ruta || window.location.pathname !== ruta)
        throw new Error('La sesión o la vista cambió. Vuelve a solicitar la acción.')
    }

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text: question },
    ]);
    setConsulta("");
    setError("");
    setIsLoading(true);

    try {
      const plan = await proponerAccion(question, ruta, captura.controles, messages.slice(-12).map(({ role, text }) => ({ role, text: text.slice(0, 3000) })))
      vigente()
      setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: plan.respuesta }])
      const accion = validarPropuesta(plan.accion, captura, ruta)
      if (plan.accion && !accion) throw new Error('La propuesta no corresponde a un control permitido.')
      if (!accion) return
      comprobarDestino(captura, accion)
      const control = accion.tipo === 'navegar' ? null : captura.controles.find(c => c.id === accion.control)
      const detalle = accion.tipo === 'navegar' ? `Abrir ${accion.destino}. Si tienes datos sin guardar, cancela y guárdalos primero.` :
        accion.tipo === 'rellenar' ? `Completar «${control?.nombre}» con «${accion.valor}». Algunos campos guardan automáticamente al editar.` :
        `Pulsar «${control?.nombre}». Esto tendrá el mismo efecto que usar ese botón manualmente y puede guardar o eliminar datos.`
      const aceptado = await dialogs.confirm(detalle, { title: 'Confirmar acción del asistente', confirmLabel: 'Autorizar acción' })
      if (!aceptado) {
        setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: 'Acción cancelada. No ejecuté la propuesta.' }])
        return
      }
      vigente()
      const permitido = ruta.startsWith('/admin') ? await validateAdminAccess() : (await authenticatedFetch('/auth/perfil')).ok
      if (!permitido) throw new Error('Tu sesión ya no autoriza esta acción. Inicia sesión nuevamente.')
      vigente()
      comprobarDestino(captura, accion)
      if (accion.tipo === 'navegar') {
        router.push(accion.destino)
      } else {
        ejecutarControl(captura, accion)
      }
      setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: accion.tipo === 'navegar'
        ? 'Navegación solicitada. Elige el cliente o indícame el siguiente paso.'
        : 'Acción aplicada a la interfaz. Revisa el resultado que muestra el formulario. Si aparece otra confirmación, debes resolverla tú.' }])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Error de conexión. Inténtalo de nuevo.",
      );
    } finally {
      setIsLoading(false);
      ocupado.current = false
    }
  }

  return (
    <div data-ia-assistant className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="Asistente IA"
          className="flex h-[min(32rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface text-text-primary shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-border bg-background-subtle px-4 py-3">
            <div>
              <h2 className="font-semibold">Asistente TRIBUTEK</h2>
              <p className="text-xs text-text-muted">¿En qué puedo ayudarte?</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente"
              className="rounded-md px-2 py-1 text-xl text-text-muted hover:bg-surface-muted"
            >
              ×
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="text-sm text-text-muted">
                Puedo abrir vistas y ayudarte con los controles visibles. Cada acción requiere tu confirmación. Prueba «Muéstrame un formulario 29».
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-primary text-on-primary" : "mr-auto bg-background-subtle text-text-primary"}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <p className="text-sm text-text-muted" role="status">
                El asistente está respondiendo…
              </p>
            )}
            {error && (
              <p
                className="rounded-lg border border-error-border bg-error-surface p-2 text-sm text-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <form ref={formRef} onSubmit={sendConsulta} className="flex items-end gap-2 border-t border-border p-3">
            <label className="sr-only" htmlFor="ia-consulta">Escribe tu consulta</label>
            <textarea
              id="ia-consulta"
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="Escribe tu consulta…"
              className="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-secondary focus:ring-2 focus:ring-secondary"
            />
            <button
              type="submit"
              disabled={isLoading || !consulta.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar asistente IA" : "Abrir asistente IA"}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-on-primary shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <span aria-hidden="true">✦</span>
        <span>Asistente IA</span>
      </button>
    </div>
  );
}
