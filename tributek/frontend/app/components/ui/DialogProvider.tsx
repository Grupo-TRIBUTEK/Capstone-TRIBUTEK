"use client"

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type FormEvent, type ReactNode,
} from "react"
import "./dialogs.css"

type Options = {
  title?: string
  confirmLabel?: string
  tone?: "default" | "danger"
  inputLabel?: string
  inputType?: "text" | "month"
  validate?: (value: string) => string | undefined
}
type Request = {
  id: number
  kind: "confirm" | "prompt" | "alert"
  message: string
  initialValue: string
  options: Options
  resolve: (value: string | boolean | null) => void
}
type Dialogs = {
  confirm: (message: string, options?: Options) => Promise<boolean>
  prompt: (message: string, initialValue?: string, options?: Options) => Promise<string | null>
  alert: (message: string, options?: Options) => Promise<void>
}
const DialogContext = createContext<Dialogs | null>(null)

/** Centraliza los avisos y conserva el orden si varias operaciones solicitan un diálogo. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const pending = useRef<Request[]>([])
  const sequence = useRef(0)
  const [current, setCurrent] = useState<Request | null>(null)

  const enqueue = useCallback((kind: Request["kind"], message: string, initialValue: string, options: Options) =>
    new Promise<string | boolean | null>((resolve) => {
      const request = { id: ++sequence.current, kind, message, initialValue, options, resolve }
      pending.current.push(request)
      if (pending.current.length === 1) setCurrent(request)
    }), [])

  const finish = useCallback((id: number, value: string | boolean | null) => {
    if (pending.current[0]?.id !== id) return
    const request = pending.current.shift()
    request?.resolve(value)
    setCurrent(pending.current[0] ?? null)
  }, [])

  useEffect(() => {
    const queue = pending.current
    return () => {
      for (const request of queue.splice(0)) request.resolve(null)
    }
  }, [])

  const dialogs = useMemo<Dialogs>(() => ({
    confirm: async (message, options = {}) => (await enqueue("confirm", message, "", options)) === true,
    prompt: async (message, initialValue = "", options = {}) => {
      const value = await enqueue("prompt", message, initialValue, options)
      return typeof value === "string" ? value : null
    },
    alert: async (message, options = {}) => { await enqueue("alert", message, "", options)
      },
  }), [enqueue])

  return <DialogContext.Provider value={dialogs}>
    {children}
    {current && <DialogPanel key={current.id} request={current} finish={(value) => finish(current.id, value)} />}
  </DialogContext.Provider>
}

/** Permite esperar una decisión antes de ejecutar una acción. Cancelar nunca confirma. */
export function useDialogs() {
  const dialogs = useContext(DialogContext)
  if (!dialogs) throw new Error("La vista debe estar dentro de DialogProvider.")
  return dialogs
}

/** Usa la capa modal del navegador para mantener foco y teclado incluso sobre otra ficha abierta. */
function DialogPanel({ request, finish }: {
  request: Request
  finish: (value: string | boolean | null) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const accept = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState("")
  const { kind, options, message } = request
  const destructive = options.tone === "danger" ||
    (options.tone !== "default" && kind === "confirm" && /eliminar|quitar|descartar|reemplazar/i.test(message))
  const title = options.title ?? (kind === "alert" ? "Información del proceso" :
    kind === "prompt" ? "Completar información" :
    /descartar/i.test(message) ? "Cambios sin guardar" :
    /reemplazar/i.test(message) ? "Restaurar respaldo" :
    /eliminar|quitar/i.test(message) ? "Confirmar eliminación" : "Confirmar acción")
  const confirmLabel = options.confirmLabel ?? (kind === "alert" ? "Entendido" :
    kind === "prompt" ? "Guardar" : /descartar/i.test(message) ? "Descartar cambios" :
    /reemplazar/i.test(message) ? "Restaurar respaldo" :
    /eliminar|quitar/i.test(message) ? "Eliminar" : "Continuar")

  useEffect(() => {
    const element = ref.current
    element?.showModal()
    const focusTarget = input.current ?? cancel.current ?? accept.current
    focusTarget?.focus()
    return () => element?.close()
  }, [])

  /** Valida antes de cerrar para que la persona pueda corregir el campo sin perderlo. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (kind === "prompt") {
      const value = input.current?.value.trim() ?? ""
      const issue = !value ? "Completa este campo para continuar." : options.validate?.(value)
      if (issue) {
        setError(issue)
        input.current?.focus()
        return
      }
      finish(value)
    } else finish(true)
  }

  return <dialog
    ref={ref}
    className="tributek-dialog"
    aria-labelledby="tributek-dialog-title"
    aria-describedby="tributek-dialog-message"
    onCancel={(event) => { event.preventDefault()
      finish(null)
      }}
  >
    <form onSubmit={submit} noValidate>
      <header className="tributek-dialog-header">
        <span className={"tributek-dialog-symbol" + (destructive ? " is-danger" : "")} aria-hidden="true">
          {destructive ? "!" : kind === "prompt" ? "+" : "i"}
        </span>
        <div>
          <p className="tributek-dialog-eyebrow">TRIBUTEK</p>
          <h2 id="tributek-dialog-title">{title}</h2>
        </div>
      </header>
      <div className="tributek-dialog-body">
        <p id="tributek-dialog-message">{message}</p>
        {kind === "prompt" && <div className="tributek-dialog-field">
          <label htmlFor="tributek-dialog-input">{options.inputLabel ?? "Información"}</label>
          <input id="tributek-dialog-input" ref={input}
            type={options.inputType ?? "text"} defaultValue={request.initialValue}
            required aria-invalid={!!error}
            aria-describedby={error ? "tributek-dialog-error" : undefined}
            onChange={() => setError("")} />
          {error && <p id="tributek-dialog-error" className="tributek-dialog-error" role="alert">{error}</p>}
        </div>}
      </div>
      <footer className="tributek-dialog-actions">
        {kind !== "alert" && <button ref={cancel} type="button" onClick={() => finish(null)}>Cancelar</button>}
        <button ref={accept} type="submit" className={destructive ? "is-danger" : "is-primary"}>{confirmLabel}</button>
      </footer>
    </form>
  </dialog>
}
