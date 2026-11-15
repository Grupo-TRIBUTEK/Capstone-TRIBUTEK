"use client"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { authenticatedFetch } from "../../features/auth/auth-client"
import { Field, Modal } from "../management/ui"
import { useDialogs } from "../ui/DialogProvider"
import Icon from "../ui/Icon"
import EditAdminEmailModal from "./EditAdminEmailModal"
import "../management/management.css"
import "./administradores.css"

type Admin = { id: string, nombre: string, nombreUsuario: string, email: string | null, emailVerificadoEn?: string | null, activo: boolean, esPrincipal: boolean }
const emptyForm = { nombre: '', nombreUsuario: '', email: '', password: '', confirmarPassword: '' }
async function responseError(response: Response) {
  const detail = await response.json().catch(() => null)
  return Array.isArray(detail?.message) ? detail.message.join(' ') : detail?.message || 'No se pudo completar la solicitud.'
}
export default function AdministradoresWorkspace() {
  const dialogs = useDialogs()
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied' | 'error'>('loading')
  const [admins, setAdmins] = useState<Admin[]>([])
  const [editingEmail, setEditingEmail] = useState<Admin | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const permissions = await authenticatedFetch('/administradores/permisos', { signal: controller.signal })
        if (!permissions.ok) throw new Error(await responseError(permissions))
        if (!(await permissions.json()).puedeGestionar) { if (!controller.signal.aborted) setAccess('denied'); return }
        const response = await authenticatedFetch('/administradores', { signal: controller.signal })
        if (!response.ok) throw new Error(await responseError(response))
        const rows = await response.json() as Admin[]
        if (!controller.signal.aborted) { setAdmins(rows); setAccess('allowed'); setError('') }
      } catch (cause) {
        if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los administradores.'); setAccess('error') }
      }
    }
    void load()
    return () => controller.abort()
  }, [reload])
  function close() { if (!lock.current) { setOpen(false); setForm(emptyForm); setFormError('') } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    if (form.password !== form.confirmarPassword) { setFormError('Las contraseñas no coinciden.'); return }
    lock.current = true
    setBusy(true)
    setFormError('')
    try {
      if (!(await dialogs.confirm('Se creará una cuenta con acceso administrativo a TRIBUTEK. Esta cuenta no podrá crear otros administradores. ¿Continuar?', { title: 'Acción solicitada', confirmLabel: 'Crear administrador' }))) return
      const response = await authenticatedFetch('/administradores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { setAccess('denied'); setForm(emptyForm); setOpen(false) }
        throw new Error(await responseError(response))
      }
      await response.json()
      setForm(emptyForm)
      setOpen(false)
      setNotice('Administrador creado. Ya puede iniciar sesión con sus credenciales. El permiso para crear administradores sigue siendo exclusivo de Constanza.')
      setReload(value => value + 1)
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.'); }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="tk tk-admin-accounts">
    <header className="tk-header"><div><p className="tk-eyebrow">TRIBUTEK / Accesos</p><h1>Administradores</h1><p className="tk-subtle">Cuentas del equipo con acceso al panel administrativo.</p></div>
      {access === 'allowed' && <button type="button" className="primary" onClick={() => { setForm(emptyForm); setFormError(''); setOpen(true) }}><Icon name="users" className="h-4 w-4" />Nuevo administrador</button>}
    </header>
    {access === 'loading' && <p role="status" className="tk-empty">Verificando acceso…</p>}
    {access === 'denied' && <p role="alert" className="tk-error">Solo Constanza tiene acceso a la gestión de administradores.</p>}
    {access === 'error' && <div role="alert" className="tk-error">{error} <button onClick={() => setReload(value => value + 1)}>Reintentar</button></div>}
    {notice && <p role="status" className="tk-success">{notice}</p>}
    {access === 'allowed' && <section className="tk-card"><div className="tk-card-head"><h2>Equipo administrativo</h2><span className="tk-subtle">{admins.length} cuentas</span></div><div className="tk-table-wrap"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th><th>Permiso</th><th>Acciones</th></tr></thead><tbody>
      {admins.map(admin => <tr key={admin.id}><td><strong>{admin.nombre}</strong></td><td>{admin.nombreUsuario}</td><td>{admin.email || 'Sin correo registrado'}{admin.email && <small>{admin.emailVerificadoEn ? 'Verificado' : 'Por verificar'}</small>}</td><td><span className={'tk-badge ' + (admin.activo ? 'green' : 'neutral')}>{admin.activo ? 'Activo' : 'Inactivo'}</span></td><td>{admin.esPrincipal ? 'Gestión de administradores' : 'Acceso administrativo'}</td><td><button type="button" onClick={() => setEditingEmail(admin)}>{admin.email && !admin.emailVerificadoEn ? "Verificar correo" : "Editar correo"}<span className="sr-only"> de {admin.nombreUsuario}</span></button></td></tr>)}
    </tbody></table></div></section>}
    {editingEmail && access === 'allowed' && <EditAdminEmailModal account={editingEmail} onClose={() => setEditingEmail(null)} onSaved={changed => { setEditingEmail(null); setNotice(changed ? 'Correo actualizado correctamente.' : 'El correo ya estaba registrado en esta cuenta.'); setReload(value => value + 1) }} />}
    {open && access === 'allowed' && <Modal title="Nuevo administrador" onClose={close} className="tk-admin-create"><form onSubmit={submit}>
      <p className="tk-subtle">Registra una cuenta para el equipo de TRIBUTEK. No tendrá permiso para crear otros administradores.</p>
      <fieldset disabled={busy} className="tk-admin-fields">
        <Field label="Nombre completo"><input required minLength={2} maxLength={120} autoComplete="name" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field label="Nombre de usuario"><input required minLength={3} maxLength={80} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,79}" autoComplete="off" value={form.nombreUsuario} onChange={e => setForm({ ...form, nombreUsuario: e.target.value })} /><small>Letras, números, punto, guion o guion bajo.</small></Field>
        <Field label="Correo electrónico"><input required type="email" pattern="[^\s@]+@[^\s@]+\.[^\s@]+" maxLength={150} autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Contraseña inicial"><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><small>Entre 12 y 128 caracteres.</small></Field>
        <Field label="Confirmar contraseña"><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.confirmarPassword} onChange={e => setForm({ ...form, confirmarPassword: e.target.value })} /></Field>
      </fieldset>
      {formError && <p role="alert" className="tk-error">{formError}</p>}
      <div className="tk-actions tk-admin-form-actions"><button type="button" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Procesando…' : 'Crear administrador'}</button></div>
    </form></Modal>}
  </div>
}
