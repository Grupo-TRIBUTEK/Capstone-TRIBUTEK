"use client"
import { useState, type FormEvent } from "react"
import Image from "next/image"
import { confirmRelink2fa, relink2fa } from "@/app/features/auth/auth-client"
import { useDialogs } from "@/app/components/ui/DialogProvider"

export default function RelinkAuthenticator() {
  const dialogs = useDialogs()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [code, setCode] = useState("")
  const [qr, setQr] = useState<{ qrCodeDataUrl: string, secret: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  function close() { setOpen(false); setQr(null); setPassword(""); setRecoveryCode(""); setCode(""); setError("") }
  async function showQr(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      if (!(await dialogs.confirm("Se mostrará el QR privado de tu cuenta. Se consumirá un código de recuperación y la protección seguirá activa.", { title: "Acción solicitada", confirmLabel: "Mostrar mi QR" }))) return
      setQr(await relink2fa(password, recoveryCode.trim()))
      setPassword("")
      setRecoveryCode("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo mostrar el QR.") }
    finally { setBusy(false) }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await confirmRelink2fa(code)
      close()
      setNotice(result.mensaje)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo comprobar el código.") }
    finally { setBusy(false) }
  }
  const inputClass = "mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary"
  const buttonClass = "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
  return <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
    <h3 className="font-semibold text-text-primary">¿Tu cuenta no aparece en la app?</h3>
    <p className="text-sm text-text-muted">Vuelve a escanear el QR desde tu aplicación autenticadora. No se cambia tu contraseña ni se desactiva la protección.</p>
    {notice && <p role="status" className="text-success">{notice}</p>}
    {!open ? <button type="button" onClick={() => { setNotice(""); setOpen(true) }} className={buttonClass}>Volver a vincular mi app</button> : <>
      {!qr ? <form onSubmit={showQr} className="max-w-md space-y-3">
        <label className="block text-sm font-medium text-text-primary">Contraseña actual<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} disabled={busy} /></label>
        <label className="block text-sm font-medium text-text-primary">Un código de recuperación sin usar<input required autoComplete="off" maxLength={32} value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className={inputClass} disabled={busy} /><small className="text-text-muted">Usa uno distinto del que utilizaste para entrar.</small></label>
        <button disabled={busy} className={buttonClass}>{busy ? "Comprobando…" : "Mostrar mi QR"}</button>
      </form> : <div className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text-primary"><li>Abre TOTP Authenticator en el teléfono y pulsa el botón +.</li><li>Elige escanear un QR, apunta a este código y guarda la cuenta TRIBUTEK.</li><li>Vuelve a la lista de cuentas de la app y escribe aquí el código de 6 dígitos de TRIBUTEK.</li></ol>
        <Image unoptimized width={220} height={220} src={qr.qrCodeDataUrl} alt="QR privado para volver a vincular tu cuenta TRIBUTEK" className="rounded-lg border border-border bg-white p-2" />
        <details className="text-sm text-text-muted"><summary>No puedo escanear el QR</summary><p>Agrega una cuenta manual de tipo TOTP, con 6 dígitos y período de 30 segundos.</p><code className="mt-2 block break-all">{qr.secret}</code></details>
        <form onSubmit={confirm} className="max-w-md space-y-3"><label className="block text-sm font-medium text-text-primary">Código generado en tu teléfono<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className={inputClass} disabled={busy} /></label><button disabled={busy || code.length !== 6} className={buttonClass}>{busy ? "Comprobando…" : "Comprobar vinculación"}</button></form>
      </div>}
      {error && <p role="alert" className="text-error">{error}</p>}
      <button type="button" disabled={busy} onClick={close} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-primary">Cerrar</button>
    </>}
  </section>
}
