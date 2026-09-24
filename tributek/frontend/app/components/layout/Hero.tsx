import Link from "next/link";

export default function Hero() {
  return (
  <section id="inicio" className="hero flex py-12 md:py-16">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:flex-row">
      <div className="hero__content flex-1  text-black">
        <span>Contabilidad que impulsa tu futuro</span>
        <h1 className="font-display text-text-primary text-4xl sm:text-5xl md:text-5xl lg:text-6xl">Transparencia y confianza</h1>
        <h1 className="font-display text-text-secundary text-4xl sm:text-5xl md:text-5xl lg:text-6xl">Tu negocio, nuestra gestión.</h1>
        <p className="font-sans text-text-muted my-5">
          Lorem ipsum dolor, sit amet consectetur adipisicing elit.
           Tempora a obcaecati reiciendis in veniam odit magnam inventore
            mollitia blanditiis aliquid, libero cumque quae quas recusandae
             accusantium illum saepe ipsam sunt!
        </p>
         <div className="flex flex-wrap items-center gap-4">
          <button
          type="button"
          className="rounded-control bg-secondary px-4 py-2 font-semibold text-primary-strong transition-colors hover:bg-secondary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Botón secundario
        </button>
        <Link
          href="#servicios"
          className="font-semibold text-primary hover:text-primary-hover"
        >
          Ver servicios
        </Link>
        
      </div>
      </div>
     

      <div className="hero__visual flex-1 ">
        {/* Segundo bloque */}
        {/* <h1 className="font-display">Bienvenido a TRIBUTEK</h1>
        <p className="font-display">Gestión contable y administrativa.</p> */}
      </div>
    </div>
  </section>
  );
}
