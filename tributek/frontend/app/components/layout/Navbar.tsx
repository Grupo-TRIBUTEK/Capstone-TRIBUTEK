"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../ui/Icon";
import ThemeSelect from "./Theme";
import BrandLogo from "./BrandLogo";

const links = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#servicios", label: "Servicios" },
  { href: "#preguntas", label: "Preguntas frecuentes" },

];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`bg-surface sticky top-0 z-20 w-full border-b border-border text-foreground transition-all duration-200 ${isScrolled ? "bg-background/80 shadow-sm backdrop-blur-md" : "bg-background"}`}>
      <nav
        className="relative  mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-3 px-4 py-2 sm:px-6"
        aria-label="Navegación principal"
      >
        <Link
          href="/"
          className="order-1 inline-flex w-fit items-center"
          aria-label="TRIBUTEK, inicio"
          onClick={closeMenu}
        >
          <BrandLogo
            width={90}
            height={40}
            priority
            className="h-auto w-24 sm:w-28"
          />
        </Link>

        <div className="order-2 flex items-center gap-2 md:order-3">
          <ThemeSelect />
          <Link
            href="/login"
            onClick={closeMenu}
            className="inline-flex h-10 items-center rounded-md bg-brand-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:px-4 sm:text-sm"
          >
            <span >Iniciar sesión</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="navbar-links"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-brand-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>

        <div
          id="navbar-links"
          className={`${menuOpen ? "flex" : "hidden"} order-3 w-full flex-col gap-1 rounded-lg border border-border bg-background p-2 text-sm font-medium text-brand-muted shadow-lg md:order-2 md:flex md:w-auto md:flex-row md:items-center md:gap-5 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map(({ href, label }) => (
            <Link
              key={label}
              className="rounded-md px-3 py-2 transition-colors hover:bg-surface-muted hover:text-brand-primary md:px-0 md:py-1 md:hover:bg-transparent"
              href={href}
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}

        </div>


      </nav>
    </header>
  );
}
