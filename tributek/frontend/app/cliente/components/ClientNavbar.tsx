"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandLogo from "@/app/components/layout/BrandLogo";
import Icon from "@/app/components/ui/Icon";
import ThemeSelect from "@/app/components/layout/Theme";
import { clearAuth } from "@/app/features/auth/auth-client";

const links = [
  { href: "/cliente/presentaciones", label: "Presentaciones" },
  { href: "/cliente#documentos", label: "Documentos" },
];

export default function ClientNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/75 text-foreground backdrop-blur-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--primary)_0%,var(--secondary)_35%,var(--secondary-strong)_65%,var(--primary)_100%)]"
      />
      <nav
        className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-3 px-4 py-2 sm:px-6"
        aria-label="Navegación del portal de clientes"
      >
        <Link href="/cliente" className="order-1 inline-flex w-fit items-center" aria-label="Inicio del portal de clientes" onClick={closeMenu}>
          <BrandLogo width={90} height={40} priority className="h-auto w-24 sm:w-28" />
        </Link>

        <div className="order-2 flex items-center gap-2 md:order-3">
          <ThemeSelect />
          <button
            type="button"
            onClick={logout}
            className="hidden min-h-10 items-center gap-2 rounded-md border border-border px-3 text-button font-semibold text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:inline-flex"
          >
            <Icon name="logout" className="h-4 w-4" />
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="client-navbar-links"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>

        <div
          id="client-navbar-links"
          className={`${menuOpen ? "flex" : "hidden"} order-3 w-full flex-col gap-1 rounded-lg border border-border bg-background p-2 text-nav font-bold text-brand-muted shadow-lg md:order-2 md:flex md:w-auto md:flex-row md:items-center md:gap-5 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={closeMenu}
              aria-current={pathname === href ? "page" : undefined}
              className={`rounded-md px-3 py-2 font-bold transition-colors hover:bg-surface-muted hover:text-primary md:px-0 md:py-1 md:hover:bg-transparent ${pathname === href ? "text-primary" : ""}`}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              closeMenu();
              logout();
            }}
            className="rounded-md px-3 py-2 text-nav text-left font-bold text-brand-muted transition-colors hover:bg-surface-muted hover:text-primary md:hidden"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    </header>
  );
}