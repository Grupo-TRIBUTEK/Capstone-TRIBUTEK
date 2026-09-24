import Navbar from "@/app/components/layout/Navbar";
import Hero from "@/app/components/layout/Hero";
import InfiniteCarousel from "./components/ui/InfiniteCarousel";
import ReviewCard from "./components/ui/ReviewCard";
import Footer from "./components/layout/Footer";

const services = ["Servicio uno", "Servicio dos", "Servicio tres"];

const reviews = [
  { name: "Ana Pérez", role: "Compradora verificada", rating: 5, review: "El servicio superó todas mis expectativas. La atención fue rápida y el producto llegó antes de lo previsto. 100% recomendado." },
];
export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen">
        <Hero />
        <section
          id="servicios"
          aria-labelledby="services-title"
          className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16"
        >
          <header className="mb-8">
            <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p>
            <h2
              id="services-title"
              className="mt-2 font-display text-3xl text-text-primary"
            >
              Servicios/ tareas (esto es un ejm)
            </h2>
            <p className="mt-3 max-w-2xl text-text-muted">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
              vitae justo sed erat facilisis consequat.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service}
                className="rounded-card border border-border bg-surface p-6"
              >
                <h3 className="font-semibold text-text-primary">{service}</h3>
                <p className="mt-2 text-text-muted">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </article>
            ))}
          </div>
        </section>


        <section
          id="confian-en-nosotros"
          aria-labelledby="trust-title"
          className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16"
        >
          <header>
            {/* <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p> */}
            <h2 id="trust-title" className="mt-2 text-center font-display text-3xl text-text-primary">
              Empresas que confían en nosotros
            </h2>
            <p className="mx-auto text-center mt-3 max-w-2xl text-text-muted">
              Esta es una idea, no es necesario forzar esta forma.
              la seccion de mensajes y comentarios puede ser
            </p>
          </header>


        </section>
        <section aria-label="Marcas y clientes" className="py-8 md:py-12">
          <InfiniteCarousel />
        </section>


        <section
          aria-labelledby="reviews-title"
          className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16"
        >
          <header>
            {/* <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p> */}
            <h2 id="reviews-title" className="mt-2 text-center font-display text-3xl text-text-primary">
              Lo que dicen nuestros clientes ...
            </h2>
            <p className="mx-auto text-center mt-3 max-w-2xl text-text-muted">
              Opiniones publicadas por clientes en.. (Por definir fuente)
              Mejores valoraciones de los ultimos 3 meses... ( confirmar filtro)
            </p>
          </header>
          <div className="mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.name} {...review} />
            ))}
          </div>
        </section>

        <section
  id="agendar"
  className="mx-auto my-8 flex w-full max-w-7xl flex-col gap-8 rounded-card bg-primary px-6 py-12 md:my-12 md:flex-row md:items-center md:justify-between md:px-10 md:py-16"
>
  <header>
    <h2 className="font-display text-text-secundary  text-3xl text-text-primary">
      Agenda
    </h2>

    <p className=" font-display mt-3 max-w-2xl text-white text-4xl sm:text-4xl md:text-4xl lg:text-5xl">
      ¿Necesitas asesoría? Agenda una atención con nosotros
    </p>
  </header>

  <div className="shrink-0">
    <button>
      Agendar atención
    </button>
  </div>

 
</section>

 <section
          className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16"
        >
          <header>
            {/* <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p> */}
            <h2 id="faq-title" className="mt-2 text-center font-display text-3xl text-text-primary">
              Preguntas frecuentes
            </h2>
            <p className="mx-auto text-center mt-3 max-w-2xl text-text-muted">
              Esqueleto de seccion de preguntas...
              Esta bien la seccion, pero podria eliminarse si no es realmente necesario..
            </p>
          </header>
          <div className="mx-auto mt-8 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
           ¿Pregunta?
                      ¿Pregunta?

          </div>
        </section>

        {/* <section
          id="nosotros"
          aria-labelledby="about-title"
          className="mx-auto w-full max-w-7xl px-6 py-16"
        >
          <header className="mb-6">
            <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p>
            <h2 id="about-title" className="mt-2 font-display text-3xl text-text-primary">
              Sobre TRIBUTEK
            </h2>
          </header>
          <div className="max-w-3xl space-y-4 text-text-muted">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
              vitae tortor euismod, tincidunt justo vel, malesuada erat.
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              consequat, nibh non consequat pretium, erat ligula consequat eros.
            </p>
          </div>
        </section> */}

        {/* <section
          id="proceso"
          aria-labelledby="process-title"
          className="mx-auto w-full max-w-7xl px-6 py-16"
        >
          <header className="mb-8">
            <p className="text-sm font-semibold text-text-muted">Lorem ipsum</p>
            <h2 id="process-title" className="mt-2 font-display text-3xl text-text-primary">
              Cómo funciona
            </h2>
          </header>
          <ol className="grid gap-6 md:grid-cols-3">
            <li className="rounded-card border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Paso uno</h3>
              <p className="mt-2 text-text-muted">Lorem ipsum dolor sit amet.</p>
            </li>
            <li className="rounded-card border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Paso dos</h3>
              <p className="mt-2 text-text-muted">Lorem ipsum dolor sit amet.</p>
            </li>
            <li className="rounded-card border border-border bg-surface p-6">
              <h3 className="font-semibold text-text-primary">Paso tres</h3>
              <p className="mt-2 text-text-muted">Lorem ipsum dolor sit amet.</p>
            </li>
          </ol>
        </section> */}
      </main>
      <Footer />
    </>
  );
}
