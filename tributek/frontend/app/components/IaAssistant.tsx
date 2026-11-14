/**
 * Interfaz IaAssistant. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, authenticatedFetch, validateAdminAccess } from "@/app/features/auth/auth-client";
import { proponerAccion } from "./ia/consultar"
import { capturarInterfaz, describirVista, comprobarDestino, ejecutarControl, validarPropuesta } from "./ia/interfaz"
import { useDialogs } from "./ui/DialogProvider"

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

/** Mantiene el chat visual en memoria. Envía la pregunta, ruta y etiquetas de controles visibles. Las acciones requieren confirmación y una sesión válida. */
export default function IaAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const dialogs = useDialogs()
  const rutaActual = useRef(pathname)
  useEffect(() => { rutaActual.current = pathname }, [pathname])
  const ocupado = useRef(false)
  const [hasSession, setHasSession] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null)
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "nearest" }) }, [messages, isLoading, isOpen])
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [consulta, isOpen]);

  useEffect(() => {
    queueMicrotask(() => setHasSession(Boolean(getAccessToken())));
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
      const plan = await proponerAccion(question, ruta, captura.controles, messages.slice(-12).map(({ role, text }) => ({ role, text: text.slice(0, 3000) })), describirVista())
      vigente()
      setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: plan.respuesta }])
      const accion = validarPropuesta(plan.accion, captura, ruta)
      if (plan.accion && !accion) throw new Error('La propuesta no corresponde a un control permitido.')
      if (!accion) return
      comprobarDestino(captura, accion)
      const control = accion.tipo === 'navegar' ? null : captura.controles.find(c => c.id === accion.control)
      const consultaVisual = /^(Abrir hoja|Ver ficha|Ver informe|Volver al panel)(?: — |$)/.test(control?.nombre ?? '')
      const detalle = accion.tipo === 'navegar' ? `Abrir ${accion.destino}. Si tienes datos sin guardar, cancela y guárdalos primero.` :
        accion.tipo === 'rellenar' ? `Completar «${control?.nombre}» con «${accion.valor}». Algunos campos guardan automáticamente al editar.` :
        consultaVisual ? `Abrir «${control?.nombre}». Revisa que corresponda al cliente y al período que necesitas.` :
        `Pulsar «${control?.nombre}». Esto tendrá el mismo efecto que usar ese botón manualmente y puede guardar o eliminar datos.`
      const aceptado = await dialogs.confirm(detalle, { title: 'Acción solicitada', confirmLabel: 'Autorizar acción' })
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
        ? 'Acción solicitada: navegación enviada. Revisa que se haya abierto la vista y luego continuamos.'
        : 'Acción solicitada: aplicada a la interfaz. Revisa el resultado y el aviso de guardado. Si aparece otra confirmación, debes resolverla tú.' }])
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
    <div data-ia-assistant className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 max-sm:bottom-5 max-sm:right-5">
      {isOpen && (
        <section
          aria-label="Asistente IA"
          className={`flex w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden border border-border bg-surface text-text-primary shadow-xl ${isExpanded ? "h-[min(48rem,calc(100dvh-7rem))]" : "h-[min(32rem,calc(100dvh-7rem))]"}`}
          style={{ borderRadius: "var(--radius-xl)" }}
        >
          <header className="flex items-center justify-between border-b border-border bg-surface-elevated px-4 py-3">
            <div>
              <h2 className="font-semibold">Asistente TRIBUTEK</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? "Reducir chat" : "Expandir chat verticalmente"}
                title={isExpanded ? "Reducir chat" : "Expandir chat verticalmente"}
                className="rounded-md px-2 py-1 text-sm text-text-muted hover:bg-surface-muted"
              >
                {isExpanded ? "↓" : "↑"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar asistente"
                className="rounded-md px-2 py-1 text-xl text-text-muted hover:bg-surface-muted"
              >
                ×
              </button>
            </div>
          </header>
          <div className="flex justify-end border-b border-border px-4 py-2">
            <button type="button" disabled={isLoading} className="text-xs text-text-muted hover:underline disabled:opacity-50" onClick={() => { setMessages([])
              setError('')
              setConsulta('')
            }}>Nueva conversación</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="text-sm text-text-muted">
                Puedo ayudarte a buscar clientes, abrir fichas y explicar los avisos de esta pantalla. Prueba «Abre el F29 del cliente C» o «No se detectan mis CSV». Te pediré autorización antes de actuar.
              </p>
            )}
            {messages.map((message) => (
              message.role === "assistant" ? (
                <div key={message.id} className="mr-auto flex max-w-[90%] items-start gap-2">
                  <img src="/icons/tributek-chatbot-esfera-clara.svg" alt="" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 dark:hidden" />
                  <img src="/icons/tributek-chatbot-esfera.svg" alt="" aria-hidden="true" className="mt-0.5 hidden h-5 w-5 shrink-0 dark:block" />
                  <div className="whitespace-pre-wrap rounded-xl bg-background-subtle px-3 py-2 text-sm text-text-primary">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div
                  key={message.id}
                  className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-xl bg-primary px-3 py-2 text-sm text-on-primary"
                >
                  {message.text}
                </div>
              )
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
            <div ref={chatEnd} />
          </div>
          <form ref={formRef} onSubmit={sendConsulta} className="border-t border-border p-3">
            <label className="sr-only" htmlFor="ia-consulta">Escribe tu consulta</label>
            <div className="rounded-lg border border-border bg-background p-2 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary">
              <textarea
                ref={inputRef}
                id="ia-consulta"
                value={consulta}
                onChange={(event) => setConsulta(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Escribe tu consulta…"
                className="block max-h-40 min-h-[44px] w-full resize-y bg-transparent px-1 py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !consulta.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar asistente Tribu IA" : "Abrir asistente Tribu IA"}
        onClick={() => setIsOpen((open) => !open)}
        className="group relative flex h-14 items-center gap-3 overflow-hidden rounded-full bg-primary px-4 pr-5 font-semibold text-on-primary shadow-[0_8px_24px_rgba(32,48,75,0.16)] transition-[box-shadow,background-color,transform] duration-200 hover:scale-105 hover:shadow-[0_10px_28px_rgba(32,48,75,0.22)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary max-sm:h-12 max-sm:gap-2.5 max-sm:px-3 max-sm:pr-4"
      >
        <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center max-sm:h-9 max-sm:w-9">
          <img src="/icons/tributek-chatbot-esfera-clara.svg" alt="" aria-hidden="true" className="h-full w-full dark:hidden" />
          <img src="/icons/tributek-chatbot-esfera.svg" alt="" aria-hidden="true" className="hidden h-full w-full dark:block" />
        </span>
        <span className="relative">Tribu IA</span>
      </button>
    </div>
  );
}
