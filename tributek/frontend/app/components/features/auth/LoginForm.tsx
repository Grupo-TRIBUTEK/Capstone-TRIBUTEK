"use client"
import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { clearAuth, isLoginChallenge, login, sendLoginEmailCode, verifyLogin2fa, type LoginChallenge, type LoginSuccess } from "@/app/features/auth/auth-client"
import { useDialogs } from "@/app/components/ui/DialogProvider"
import BrandLogo from "@/app/components/layout/BrandLogo"
import Icon from "@/app/components/ui/Icon"

export default function LoginForm() {
  const router = useRouter()
  const dialogs = useDialogs()
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [method, setMethod] = useState<'app' | 'email' | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (!cooldown) return
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timeout)
  }, [cooldown])
  function redirectByRole(response: LoginSuccess) {
    const role = response.usuario.rolNombre?.toUpperCase()
    if (role === 'ADMIN' || role === 'ADMINISTRADOR' || response.usuario.rolId === '1') router.replace('/admin')
    else if (role === 'CLIENTE') router.replace('/cliente')
    else { clearAuth(); setError('Tu cuenta no tiene un rol habilitado para acceder a estos paneles.') }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      const response = await login(nombreUsuario, password)
      setPassword('')
      if (isLoginChallenge(response)) { setChallenge(response); setMethod(null); setTwoFactorCode(''); setEmailSent(false); setNotice('') }
      else redirectByRole(response)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.') }
    finally { setIsSubmitting(false) }
  }
  async function chooseEmail(resend = false) {
    if (!challenge || isSubmitting) return
    setError('')
    setNotice('')
    if (emailSent && !resend) { setMethod('email'); setTwoFactorCode(''); return }
    setIsSubmitting(true)
    try {
      if (!(await dialogs.confirm('Se enviará un código al correo registrado de tu cuenta.', { title: 'Acción solicitada', confirmLabel: 'Enviar código' }))) return
      const response = await sendLoginEmailCode(challenge.challengeToken)
      setMethod('email'); setEmailSent(true); setTwoFactorCode(''); setCooldown(60)
      setNotice(`${response.mensaje} ${response.maskedEmail}. Vence en 5 minutos o cuando termine este intento de ingreso.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo enviar el código.') }
    finally { setIsSubmitting(false) }
  }
  async function handleVerify2fa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!challenge || !method || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try { redirectByRole(await verifyLogin2fa(challenge.challengeToken, twoFactorCode.trim(), method)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo verificar el código.') }
    finally { setIsSubmitting(false) }
  }
  if (challenge) {
    const methods = challenge.methods ?? ['app']
    return <form key="two-factor" onSubmit={handleVerify2fa} className="tk-stack">
      <BrandLogo width={180} height={110} className="h-auto" />
      <div><p className="tk-login-welcome">Verificación en dos pasos</p><h1>Elige cómo verificarte</h1><p className="tk-subtle">{methods.length > 1 ? 'Usa tu aplicación autenticadora o recibe un código en tu correo registrado.' : methods.includes('email') ? 'Recibe un código en el correo registrado de tu cuenta.' : 'Usa tu aplicación autenticadora para continuar.'}</p></div>
      <div className={methods.length > 1 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-1 gap-3"} role="group" aria-label="Método de verificación">
        {methods.includes('app') && <button type="button" aria-pressed={method === 'app'} className={method === 'app' ? 'primary' : ''} disabled={isSubmitting || !methods.includes('app')} onClick={() => { setMethod('app'); setTwoFactorCode(''); setError(''); setNotice('') }}><Icon name="shield" className="h-4 w-4" />App autenticadora</button>}
        {methods.includes('email') && <button type="button" aria-pressed={method === 'email'} className={method === 'email' ? 'primary' : ''} disabled={isSubmitting || !methods.includes('email')} onClick={() => void chooseEmail()}><Icon name="file" className="h-4 w-4" />Código por correo</button>}
      </div>
      {method && <>
        <p className="tk-subtle">{method === 'app' ? 'Escribe el código de tu app o un código de recuperación sin usar.' : 'Escribe el código que recibiste por correo.'}</p>
        <label className="tk-field">{method === 'app' ? 'Código de verificación o recuperación' : 'Código recibido por correo'}<input key={method} name="twoFactorCode" inputMode={method === 'email' ? 'numeric' : 'text'} autoComplete="one-time-code" required maxLength={method === 'email' ? 6 : 32} pattern={method === 'email' ? '[0-9]{6}' : undefined} value={twoFactorCode} onChange={event => setTwoFactorCode(method === 'email' ? event.target.value.replace(/\D/g, '') : event.target.value.replace(/\s+/g, ''))} placeholder={method === 'email' ? '000000' : 'Código de tu app o de recuperación'} /></label>
        <button type="submit" className="primary" disabled={isSubmitting || twoFactorCode.length < 6}>{isSubmitting ? 'Verificando…' : 'Confirmar código'}</button>
        {method === 'email' && <button type="button" disabled={isSubmitting || cooldown > 0} onClick={() => void chooseEmail(true)}>{cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</button>}
      </>}
      {notice && <p role="status" className="tk-success">{notice}</p>}
      {error && <p role="alert" className="tk-error">{error}</p>}
      <button type="button" className="tk-subtle" onClick={event => { event.preventDefault(); clearAuth(); window.location.replace('/login') }}><Icon name="arrowLeft" className="h-4 w-4" />Volver al inicio de sesión</button>
    </form>
  }
  return (
    <form key="credentials" onSubmit={handleSubmit} className="tk-stack">
      <BrandLogo width={180} height={110} className="h-auto" />
      <div>
        <p className="tk-login-welcome">Bienvenido de nuevo</p>
        <h1>Ingresa a tu cuenta</h1>
        <p className="tk-subtle">Accede con tu nombre de usuario o correo electrónico.</p>
      </div>
      <label className="tk-field">
        Correo o nombre de usuario
        <input
          name="username"
          autoComplete="username"
          required
          placeholder="usuario@correo.cl"
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
        />
      </label>
      <label className="tk-field">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p role="alert" className="tk-error">{error}</p>}
      <button className="primary" disabled={isSubmitting}>
        <Icon name="login" className="h-4 w-4" />
        {isSubmitting ? "Validando…" : "Entrar a mi cuenta"}
      </button>
      <Link href="/" className="tk-subtle">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Volver al inicio
      </Link>
    </form>
  );
}
