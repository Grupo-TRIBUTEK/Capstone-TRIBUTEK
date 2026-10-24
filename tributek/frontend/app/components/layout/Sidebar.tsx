"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth } from "@/app/features/auth/auth-client";

import Icon from "../ui/Icon";
import { adminNavigation } from "./adminNavigation";
import ThemeSelect from "./Theme";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <aside className={`admin-sidebar admin-sidebar-enter ${collapsed ? "admin-sidebar-collapsed" : ""} w-full shrink-0 bg-primary p-5 text-white md:min-h-screen`}>
      <div className={`flex items-start border-b border-white/20 pb-5 ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
        <div className="admin-sidebar-brand">
          <p className="text-2xl font-bold tracking-wide">TRIBUTEK</p>
          <p className="mt-1 text-sm text-on-primary-muted">Gestión administrativa</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? "Mostrar nombres del menú" : "Mostrar solo iconos"}
          aria-expanded={!collapsed}
          title={collapsed ? "Mostrar nombres del menú" : "Mostrar solo iconos"}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/30 px-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${collapsed ? "size-10" : ""}`}
        >
          <Icon name="menu" />
        </button>
      </div>
      <nav aria-label="Menú administrativo" className="mt-5 space-y-6">
        {["Gestión"].map((group) => (
          <details
            key={group}
            open={
              group === "Gestión" ||
              adminNavigation.some(
                (i) => i.group === group && i.href === pathname,
              )
            }
          >
            <summary className="admin-sidebar-section-label mb-3 cursor-pointer text-xs font-semibold uppercase tracking-widest text-on-primary-muted">
              {group === "Gestión" ? "Gestión mensual" : "Más herramientas"}
            </summary>
            <ul className={`grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1 ${collapsed ? "md:gap-2" : ""}`}>
              {adminNavigation
                .filter((item) => item.group === group)
                .map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      pathname.startsWith(`${item.href}/`));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${collapsed ? "md:justify-center md:px-2" : ""} ${isActive ? "bg-secondary text-on-secondary" : "text-on-primary-muted hover:bg-white/10 hover:text-white"}`}
                      >
                        <Icon name={item.icon} />
                        <span className="admin-sidebar-link-label">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </details>
        ))}
      </nav>
      <div className="admin-sidebar-theme mt-6 flex w-full items-center justify-center gap-3">
        <ThemeSelect sidebar />
      </div>

      <button
        type="button"
        onClick={() => confirmLogout ? handleLogout() : setConfirmLogout(true)}
        aria-label={confirmLogout ? "Confirmar salida del panel admin" : "Cerrar sesión"}
        className="admin-sidebar-logout button-destructive mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border px-3 py-3 text-center text-sm font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Icon name="logout" />
        {confirmLogout ? "Confirmar salida" : "Cerrar sesión"}
      </button>
    </aside>
  );
}
