import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section id="inicio" className="bg-secondary-surface py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-secondary-strong">Contabilidad que impulsa tu futuro</p>
          <h1 className="font-display text-4xl leading-tight text-text-primary md:text-6xl">
            Transparencia y confianza.<span className="mt-3 block text-secondary-strong">Tu negocio, nuestra gestión.</span>
          </h1>
          <p className="my-7 max-w-lg text-lg leading-relaxed text-text-muted">Acompañamiento contable para organizar tus obligaciones, mantener tus pagos al día y dar el siguiente paso con tu empresa.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/login" className="rounded-control bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-hover">Acceder a mi cuenta</Link>
            <a href="#servicios" className="font-semibold text-primary underline underline-offset-4">Conocer los servicios</a>
          </div>
        </div>
        <div className="rounded-3xl border border-secondary-soft bg-surface p-10 shadow-sm md:p-16">
          <Image src="/images/tras-TRIBUTEK.svg" alt="TRIBUTEK" width={420} height={280} priority className="mx-auto h-auto w-full max-w-sm" />
          <p className="mt-8 text-center text-sm tracking-wide text-text-muted">Gestión contable independiente</p>
        </div>
      </div>
    </section>
  );
}

