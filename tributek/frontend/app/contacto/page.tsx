import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-surface px-6 py-20 text-text-primary md:py-28">
        <div className="mx-auto max-w-7xl">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary-strong">Contacto</p>
            <h1 className="mt-3 font-[Georgia,serif] text-[35px] font-normal leading-tight text-text-primary md:text-[48px]">
              Contáctanos por nuestros canales principales.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-text-muted">
              Encuéntranos en Puerto Montt o accede a tu cuenta para continuar con tu gestión.
            </p>
          </header>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.9fr_1fr]">
            <div className="flex flex-col gap-5">
              <div className="rounded-card border border-border bg-surface p-5">
                <h2 className="text-base font-semibold text-text-primary">Redes sociales y contacto</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  Síguenos en nuestras redes sociales para estar al tanto de nuestras novedades.
                </p>
                {/* Links redes sociales */}
                <ul className="mt-4 flex flex-col gap-2">
                  {[
                    "WhatsApp",
                    "Instagram",
                    "Facebook",
                  ].map((channel) => (
                    <li key={channel}>
                      <button
                        type="button"
                        disabled
                        className="flex min-h-11 w-full items-center rounded-control border border-border bg-background px-4 py-2 text-left font-semibold text-text-primary disabled:cursor-not-allowed"
                      >
                        {channel}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex min-h-[320px] flex-col overflow-hidden rounded-card border border-border bg-background">
                <iframe
                  title="Ubicación de TRIBUTEK en Puerto Montt"
                  src="https://maps.google.com/maps?q=Guillermo%20Gallardo%20166%2C%205480000%20Puerto%20Montt%2C%20Los%20Lagos&output=embed"
                  className="min-h-[260px] w-full flex-1 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="border-t border-border px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary-strong">Dirección</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="select-text text-sm leading-relaxed text-text-primary">Guillermo Gallardo 166, 5480000 Puerto Montt, Los Lagos</p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Guillermo+Gallardo+166%2C+5480000+Puerto+Montt%2C+Los+Lagos"
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-sm font-semibold text-primary underline underline-offset-4 hover:text-secondary-strong"
                    >
                      Abrir mapa
                    </a>
                  </div>
                {/* div de horario de atencion */}
                  <div className="mt-4 border-t border-border pt-4 mt-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-secondary-strong">Horario (se puede hacer dinamicamente)</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">Lunes a viernes, 9:00 a 18:00 hrs</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="min-h-[320px] rounded-card border border-border bg-background p-6 md:p-8">
              <h2 className="font-[Georgia,serif] text-2xl font-normal text-text-primary">Formulario</h2>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}