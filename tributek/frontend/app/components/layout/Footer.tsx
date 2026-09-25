import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-6 py-10">
        <div>
          <a href="#inicio" aria-label="Volver al inicio"><Image src="/images/tras-TRIBUTEK.svg" alt="TRIBUTEK" width={110} height={75} className="h-auto" /></a>
          <p className="mt-3 text-sm text-text-muted">Contabilidad que impulsa tu futuro.</p>
        </div>
        <nav aria-label="Navegación del pie de página" className="flex flex-wrap gap-6 text-sm text-text-primary">
          <a href="#nosotros">Nosotros</a><a href="#servicios">Servicios</a><Link href="/login">Iniciar sesión</Link>
        </nav>
        <p className="w-full border-t border-border pt-5 text-xs text-text-muted">© {new Date().getFullYear()} TRIBUTEK. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
