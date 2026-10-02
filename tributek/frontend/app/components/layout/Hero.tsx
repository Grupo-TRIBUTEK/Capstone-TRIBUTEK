import Image from "next/image";
import Link from "next/link";
import Icon from "../ui/Icon";
import ContactSlider from "./ContactSlider";
import HeroShowcase from "./HeroShowcase";

export default function Hero() {
  return (
    <section id="inicio" className="relative isolate  py-16 md:py-18">
      <div aria-hidden="true" className="hero-left-shadow pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2" />
      <div aria-hidden="true" className="hero-right-shadow pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2" />
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 text-label font-semibold uppercase tracking-[0.2em] text-secondary-strong">
            <span className="hero-badge-dot h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
            <span className="hero-label-gradient">Contabilidad que impulsa tu futuro</span>
          </div>
          <h1 className="font-[Georgia,serif] text-display font-normal leading-[0.99] tracking-[-0.03em] text-text-primary">
            Transparencia y confianza.
            
            {/* <span className="mt-3 block text-secondary-strong">Tu negocio, nuestra gestión.</span> */}
          </h1>
          <p className="my-7 max-w-lg text-body-lg leading-relaxed text-text-muted">Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum beatae exercitationem fugit. Harum animi accusantium maxime voluptatibus temporibus sapiente et enim. Labore quae atque rem, quia accusantium hic expedita veritatis.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/login" className="hero-gradient-hover inline-flex min-h-12 items-center gap-2 rounded-control border border-primary bg-primary px-6 py-3 text-button font-semibold text-white hover:brightness-110"><Icon name="login" className="h-4 w-4" />Acceder a mi cuenta</Link>
            <a href="#servicios" className="inline-flex min-h-12 items-center gap-2 rounded-control border border-primary px-6 py-3 text-button font-semibold text-primary transition-colors hover:border-secondary hover:bg-secondary hover:text-primary dark:hover:border-secondary dark:hover:bg-secondary dark:hover:text-background">Conocer los servicios<Icon name="arrowRight" className="h-4 w-4" /></a>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Beneficios">
            {[ "lorem", " lorem", " lorem"].map((benefit) => (
              <li key={benefit} className="rounded-full   px-3 py-1.5 text-body-sm font-semibold text-text-primary">
                {benefit}
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-lg text-body-sm leading-relaxed text-text-muted">
            lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.
          </p>
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
        <HeroShowcase></HeroShowcase>
      </div>
    </section>
  );
}

