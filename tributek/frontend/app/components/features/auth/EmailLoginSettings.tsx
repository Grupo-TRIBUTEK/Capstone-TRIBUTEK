"use client"
import { useState, type FormEvent } from "react"
import { confirmMyEmailVerification, requestMyEmailVerification } from "@/app/features/auth/auth-client"
import { useDialogs } from "@/app/components/ui/DialogProvider"
export default function EmailLoginSettings({ enabled, registered, available, maskedEmail, onVerified }: { enabled: boolean, registered: boolean, available: boolean, maskedEmail: string | null, onVerified: () => Promise<void> }) {
  const dialogs = useDialogs()
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      if (!(await dialogs.confirm(sent ? 'Se habilitará el ingreso con códigos enviados al correo de tu cuenta.' : 'Se enviará un código al correo registrado en tu cuenta para comprobar que tienes acceso.', { title: 'Acción solicitada', confirmLabel: sent ? 'Verificar correo' : 'Enviar código' }))) return
      if (sent) { const result = await confirmMyEmailVerification(code); setNotice(result.mensaje); setPassword(''); setCode(''); await onVerified() }
      else { const result = await requestMyEmailVerification(password); setPassword(''); setSent(true); setNotice(`${result.mensaje} ${result.maskedEmail}. Vence en 5 minutos.`) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo verificar el correo.') }
    finally { setBusy(false) }
  }
  const inputClass = 'mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary'
  return <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
    <h3 className="font-semibold text-text-primary">Código por correo al iniciar sesión</h3>
    {enabled ? <p className="text-sm text-success">Disponible para {maskedEmail}. Después de tu contraseña podrás elegir el correo como método de verificación.</p> : <>
      <p className="text-sm text-text-muted">Puedes recibir códigos de ingreso en el correo registrado. Se comprobará al usarlo por primera vez. Si prefieres, también puedes verificarlo aquí ahora.</p>
      {!registered ? <p className="text-sm text-warning">Tu cuenta todavía no tiene un correo registrado. Pide a la responsable que lo agregue.</p> : !available ? <p className="text-sm text-warning">El servicio de correo no está disponible. Revisa la configuración del remitente.</p> : <form onSubmit={submit} className="max-w-md space-y-3">
        <p className="text-sm text-text-muted">Correo registrado: {maskedEmail}</p>
        {sent ? <label className="block text-sm font-medium text-text-primary">Código enviado a tu correo<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} disabled={busy} className={inputClass} /></label> : <label className="block text-sm font-medium text-text-primary">Contraseña actual para verificar el correo<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className={inputClass} /></label>}
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Procesando…' : sent ? 'Verificar correo' : 'Enviar código de verificación'}</button>
        {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setNotice(''); setError('') }} className="ml-3 text-sm text-text-muted">Solicitar otro código</button>}
      </form>}
    </>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </section>
}
