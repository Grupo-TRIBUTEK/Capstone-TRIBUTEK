"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { authenticatedFetch } from "../../features/auth/auth-client"
import Icon from "../ui/Icon"
export default function AdministratorAccessLink({ collapsed, pathname }: { collapsed: boolean, pathname: string }) {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    authenticatedFetch('/administradores/permisos', { signal: controller.signal })
      .then(async response => response.ok && (await response.json()).puedeGestionar === true)
      .then(value => { if (!controller.signal.aborted) setAllowed(Boolean(value)) })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  if (!allowed) return null
  const active = pathname === '/admin/administradores'
  return <Link href="/admin/administradores" aria-current={active ? 'page' : undefined} title={collapsed ? 'Administradores' : undefined} className={
    'mt-5 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ' +
    (collapsed ? 'md:justify-center md:px-2 ' : '') + (active ? 'bg-secondary text-on-secondary' : 'text-on-primary-muted hover:bg-white/10 hover:text-white')
  }><Icon name="shield" /><span className="admin-sidebar-link-label">Administradores</span></Link>
}
