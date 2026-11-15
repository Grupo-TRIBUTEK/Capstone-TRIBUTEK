"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { authenticatedFetch } from "../../features/auth/auth-client"
import { Field, Modal } from "../management/ui"
import { useDialogs } from "../ui/DialogProvider"

type Account = { id: string, nombreUsuario: string, email: string | null }
export default function EditAdminEmailModal({ account, onClose, onSaved }: { account: Account, onClose: () => void, onSaved: (changed: boolean) => void }) {
  const dialogs = useDialogs()
  const [email, setEmail] = useState(account.email || "")
  const [password, setPassword] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const normalized = email.trim().toLowerCase()
  const confirming = sentTo !== "" && sentTo === normalized
  useEffect(() => {
    if (!cooldown) return
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timeout)
  }, [cooldown])
  async function request(confirm: boolean) {
    if (lock.current) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError("Ingresa un correo con @ y un punto en el dominio, por ejemplo nombre@duocuc.cl."); return }
    if (!password) { setError("Ingresa la contraseña actual de ConstanzaS."); return }
    lock.current = true
    setBusy(true)
    setError("")
    try {
      const message = confirm ? `Se guardará el correo confirmado para ${account.nombreUsuario}. ¿Continuar?` : `Se enviará un código al correo nuevo. El correo actual de ${account.nombreUsuario} se conservará hasta que confirmes el código.`
      if (!(await dialogs.confirm(message, { title: "Acción solicitada", confirmLabel: confirm ? "Confirmar correo" : "Enviar código" }))) return
      const path = `/administradores/${encodeURIComponent(account.id)}/correo${confirm ? "" : "/solicitar"}`
      const response = await authenticatedFetch(path, { method: confirm ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalized, password, ...(confirm ? { code } : {}) }) })
      if (!response.ok) {
        const details = await response.json().catch(() => null)
        throw new Error(Array.isArray(details?.message) ? details.message.join(" ") : details?.message || "No se pudo completar el cambio de correo.")
      }
      const result = await response.json() as { actualizado?: boolean, mensaje?: string }
      if (confirm) { setPassword(""); onSaved(result.actualizado === true) }
      else { setSentTo(normalized); setCode(""); setCooldown(60); setNotice(result.mensaje || "Código enviado. Vence en 5 minutos.") }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la solicitud.") }
    finally { lock.current = false; setBusy(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void request(confirming) }
  return <Modal title="Editar correo" onClose={() => { if (!lock.current) onClose() }} className="tk-admin-create"><form onSubmit={submit}>
    <p className="tk-subtle">Cuenta: <strong>{account.nombreUsuario}</strong>. Confirma con la contraseña actual de ConstanzaS. El correo anterior se conservará hasta verificar el nuevo.</p>
    <fieldset className="tk-admin-fields" disabled={busy}>
      <Field label="Nuevo correo electrónico"><input type="email" required maxLength={150} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setCode(""); setNotice(""); setError("") }} /><small>Debe incluir @ y un punto en el dominio. Si te equivocaste, corrígelo aquí y solicita otro código.</small></Field>
      <Field label="Contraseña actual de ConstanzaS"><input type="password" required maxLength={128} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
      {confirming && <Field label="Código enviado al nuevo correo"><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /><small>Enviado a {sentTo}. Vence en 5 minutos y solo se puede usar una vez.</small></Field>}
    </fieldset>
    {notice && <p role="status" className="tk-success">{notice}</p>}
    {error && <p role="alert" className="tk-error">{error}</p>}
    {confirming && <button type="button" disabled={busy || cooldown > 0} onClick={() => void request(false)}>{cooldown ? `Reenviar en ${cooldown} s` : "Reenviar código"}</button>}
    <div className="tk-actions tk-admin-form-actions"><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={busy || (!confirming && cooldown > 0)}>{busy ? "Procesando…" : confirming ? "Confirmar correo" : cooldown > 0 ? `Enviar en ${cooldown} s` : "Enviar código"}</button></div>
  </form></Modal>
}
