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
        {/* Componente Hero */}
        <Hero />

        {/* Seccion de nuestros servicios  */}
        <section id="servicios" aria-labelledby="services-title" className="mx-auto max-w-7xl scroll-mt-6 px-6 py-24 md:py-32">
          <p className="text-label font-semibold uppercase tracking-widest text-secondary-strong">Nuestros servicios</p>
          <h2 id="services-title" className="mt-3 font-[Georgia,serif] text-h2 font-normal leading-tight text-text-primary">Más claridad para tu negocio.</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {services.map((service, index) => <article key={service.title} className="service-card rounded-card border border-border p-7"><span className="text-label font-semibold text-secondary-strong">0{index+1}</span><h3 className="mt-5 text-h3 font-semibold">{service.title}</h3><p className="mt-3 text-body leading-relaxed text-text-muted">{service.text}</p></article>)}
          </div>
        </section>

        {/* Seccion de nosotros TRIBUTEK */}
        <section id="nosotros" aria-labelledby="about-title" className="bg-primary px-6 py-24 text-white md:py-32">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
            <h2 id="about-title" className="font-[Georgia,serif] text-h2 font-normal leading-tight text-white">Cercanía, orden y seguimiento.</h2>
            <p className="max-w-xl text-body-lg leading-relaxed">En TRIBUTEK acompañamos la gestión contable y administrativa de tu empresa, con información clara sobre tus obligaciones y un seguimiento de cada período.</p>
          </div>
        </section>
        <section id="preguntas" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-6 py-24 md:py-32">
          <h2 id="faq-title" className="mb-8 font-[Georgia,serif] text-h2 font-normal leading-tight text-text-primary">Preguntas frecuentes</h2>
          {questions.map(q => <details key={q.title} className="border-b border-border py-5"><summary className="cursor-pointer text-subtitle font-semibold">{q.title}</summary><p className="mt-4 text-body leading-relaxed text-text-muted">{q.text}</p></details>)}
        </section>
      </main>
      <Footer />
    </>
  );
}
