import Navbar from "./components/layout/Navbar";
import Hero from "./components/layout/Hero";
import Footer from "./components/layout/Footer";

const services = [
  { title: "Gestión mensual", text: "Organización de obligaciones y seguimiento de los compromisos de cada período." },
  { title: "Formalización de empresas", text: "Acompañamiento y seguimiento de los trámites para iniciar tu empresa." },
  { title: "Servicios y asesorías", text: "Apoyo en trámites y necesidades contables específicas de tu negocio." },
];
const questions = [
  { title: "¿Cómo ingreso a mi cuenta?", text: "Selecciona Iniciar sesión e ingresa con las credenciales que te entregó TRIBUTEK." },
  { title: "¿Qué debo hacer si ya pagué?", text: "Envía el comprobante a tu administradora por el canal habitual para que pueda revisar y actualizar tu registro." },
  { title: "¿Cómo solicito un servicio?", text: "Contacta a tu administradora para revisar lo que necesita tu empresa y acordar el servicio correspondiente." },
];
export default function Home() {
  return (
    <>
      <Navbar />
      <main className="text-text-primary">
        <Hero />
        <section id="servicios" aria-labelledby="services-title" className="mx-auto max-w-7xl scroll-mt-6 px-6 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-strong">Nuestros servicios</p>
          <h2 id="services-title" className="mt-3 font-display text-3xl md:text-4xl">Más claridad para tu negocio.</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {services.map((service, index) => <article key={service.title} className="rounded-card border border-border bg-surface p-7"><span className="text-sm font-semibold text-secondary-strong">0{index+1}</span><h3 className="mt-5 text-xl font-semibold">{service.title}</h3><p className="mt-3 leading-relaxed text-text-muted">{service.text}</p></article>)}
          </div>
        </section>
        <section id="nosotros" aria-labelledby="about-title" className="bg-primary px-6 py-16 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
            <h2 id="about-title" className="font-display text-3xl md:text-4xl">Cercanía, orden y seguimiento.</h2>
            <p className="max-w-xl text-lg leading-relaxed">En TRIBUTEK acompañamos la gestión contable y administrativa de tu empresa, con información clara sobre tus obligaciones y un seguimiento de cada período.</p>
          </div>
        </section>
        <section id="preguntas" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <h2 id="faq-title" className="mb-8 font-display text-3xl">Preguntas frecuentes</h2>
          {questions.map(q => <details key={q.title} className="border-b border-border py-5"><summary className="cursor-pointer text-lg font-semibold">{q.title}</summary><p className="mt-4 leading-relaxed text-text-muted">{q.text}</p></details>)}
        </section>
      </main>
      <Footer />
    </>
  );
}
