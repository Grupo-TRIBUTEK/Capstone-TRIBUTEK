import Image from "next/image";
import Link from "next/link";
import Icon, { type IconName } from "../ui/Icon";

const benefits: { id: string; label: string; icon: IconName }[] = [
  { id: "benefit-1", label: "Contabilidad", icon: "calculator" },
  { id: "benefit-2", label: "Asesoría tributaria", icon: "percent" },
  { id: "benefit-3", label: "Recursos humanos", icon: "users" },
];

export default function Hero() {
  return (
    <section id="inicio" className="hero-section relative isolate py-16 md:py-17">
      <div aria-hidden="true" className="hero-left-shadow pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2" />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary-soft bg-secondary-surface p-2 text-label font-semibold uppercase tracking-[0.2em] text-secondary-strong">
            <span className="hero-badge-dot h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
            <span className="hero-label-gradient">SERVICIOS CONTABLES Y TRIBUTARIOS</span>
          </div>
          <h1 className="font-[Georgia,serif] text-display font-normal leading-[0.99] tracking-[-0.03em] text-text-primary">
            Gestión contable para el crecimiento de tu empresa
          </h1>
          <p className="my-7 max-w-lg text-body-lg leading-relaxed text-text-muted">
            En TRIBUTEK simplificamos la gestión de tu empresa mediante servicios de contabilidad,
             asesoría tributaria, recursos humanos y prevención de riesgos, 
            con atención personalizada y acompañamiento para empresas, pymes y emprendedores.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/login"
              className="hero-gradient-hover inline-flex min-h-12 items-center gap-2 rounded-control border border-primary bg-primary px-6 py-3 text-button font-semibold text-white hover:brightness-110"
            >
              <Icon name="login" className="h-4 w-4" />
              Acceder a mi cuenta
            </Link>
            <a
              href="#servicios"
              className="inline-flex min-h-12 items-center gap-2 rounded-control border border-primary px-6 py-3 text-button font-semibold text-primary transition-colors hover:border-secondary hover:bg-secondary hover:text-primary dark:hover:border-secondary dark:hover:bg-secondary dark:hover:text-background"
            >
              Conocer los servicios
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Beneficios">
            {benefits.map((benefit) => (
              <li key={benefit.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-label font-semibold text-text-primary">
                <Icon name={benefit.icon} className="h-4 w-4 text-secondary-strong" />
                {benefit.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-lg text-body-sm leading-relaxed text-text-muted">
            lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.
          </p>
        </div>

        <div className="w-full">
          <article aria-label="Vista previa ilustrativa del portal de clientes" className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-3 text-white">
              <span className="text-xs font-bold tracking-[0.16em]">TRIBUTEK</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium">Panel cliente</span>
            </div>
            <div className="bg-background p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary-strong">Bienvenido a TRIBUTEK</p>
                <h2 className="mt-1 text-base font-semibold text-text-primary">Tus empresas</h2>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-[10px] text-text-muted">Empresa asociada</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">Empresa de ejemplo</p>
                  <span className="rounded-full bg-secondary-surface px-2 py-1 text-[10px] font-medium text-secondary-strong">Activa</span>
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-border bg-surface p-3">
                <p className="text-xs font-semibold text-text-primary">Lorem ipsum dolor sit amet</p>
                <p className="mt-1 text-[10px] leading-relaxed text-text-muted">Consectetur adipiscing elit, sed do eiusmod tempor.</p>
              </div>
              <div className="mt-3 rounded-lg border border-secondary/30 bg-secondary-surface p-3">
                <p className="text-xs font-semibold text-text-primary">¿Aún no tienes acceso?</p>
                <p className="mt-1 text-[10px] leading-relaxed text-text-muted">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
          </article>
          <div className="relative mt-3 flex min-h-20 items-center justify-center px-4 py-2">
            <p className="max-w-[76%] text-center text-xs font-medium leading-relaxed text-secondary-strong">
              En TRIBUTEK creamos un ambiente agradable y cercano para nuestros clientes.
            </p>
          </div>
        </div>
        {/* <div className="w-full">
          <div className="w-full rounded-[28px] border border-border  p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <Image
                src="/images/tras-TRIBUTEK.svg"
                alt="TRIBUTEK"
                width={1200}
                height={900}
                priority
                className="h-[420px] w-full object-cover"
              />
          </div>
        </div> */}
<!--    Esto era la integracion de un slider dinamico pero mejor una card  :p    -->
<!--         <HeroShowcase></HeroShowcase> -->
      </div>
    </section>
  );
}
