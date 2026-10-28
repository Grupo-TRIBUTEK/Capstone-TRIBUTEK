/**
 * Interfaz IaAssistant. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { getAccessToken } from "@/app/features/auth/auth-client";
import { consultarAsistente } from "./ia/consultar";

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

/** Mantiene el chat visual en memoria. Envía la pregunta y ruta actual, no el historial ni registros de clientes. */
export default function IaAssistant() {
  const pathname = usePathname();
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
    if (!question || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text: question },
    ]);
    setConsulta("");
    setError("");
    setIsLoading(true);

    try {
      const respuesta = await consultarAsistente(question, pathname);
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: respuesta },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Error de conexión. Inténtalo de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
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
                Escribe tu consulta para comenzar.
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
          <form
            ref={formRef}
            onSubmit={sendConsulta}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <label className="sr-only" htmlFor="ia-consulta">
              Escribe tu consulta
            </label>
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
