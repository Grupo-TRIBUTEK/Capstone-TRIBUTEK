/**
 * Interfaz Footer. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
import Link from "next/link";
import BrandLogo from "./BrandLogo";

/** Presenta enlaces y datos de contacto del pie de página. */
export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-6 py-10">
        <div>
          <Link href="/#inicio" aria-label="Volver al inicio">
            <BrandLogo width={110} height={75} className="h-auto" />
          </Link>
          <p className="mt-3 text-sm text-text-muted">
            Contabilidad que impulsa tu futuro.
          </p>
        </div>
        <nav
          aria-label="Navegación del pie de página"
          className="flex flex-wrap gap-6 text-sm text-text-primary"
        >
          <Link href="/#nosotros">Nosotros</Link>
          <Link href="/#servicios">Servicios</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/login">Iniciar sesión</Link>
        </nav>
        <p className="w-full border-t border-border pt-5 text-xs text-text-muted">
          © {new Date().getFullYear()} TRIBUTEK. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
