import Image from "next/image";

const footerSections = [
  {
    title: "Producto",
    links: ["LINK 1", "LINK 2", "LINK 3 ", "LINK 4", "LINK 5"],
  },
  {
    title: "Compañía",
    links: ["Material educativo", "Blog", "Términos y Condiciones", "Política de Privacidad"],
  },
  {
    title: "Contacto",
    links: ["Contacto y cotizaciones", "Ventas: ventas@tributek.cl", "Ventas: nro", "Soporte: correo@gmail.", "Puerto Montt, Región De Los Lagos, Chile"],
  },
];

const socialLinks = [
  { name: "Instagram", icon: "instagram" },
  { name: "Facebook", icon: "facebook" },
  { name: "WhatsApp", icon: "whatsapp" },
] as const;

function SocialIcon({ name }: { name: (typeof socialLinks)[number]["icon"] }) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.2V13H10v8h3.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.6A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path d="M8.5 8.2c.3-.5.6-.5 1-.5l.8 1.8c.1.3 0 .5-.2.8l-.6.7c.8 1.5 1.8 2.4 3.4 3.1l.7-.8c.2-.2.5-.3.8-.2l1.7.8c.3.2.4.4.3.8-.2 1-1.1 1.7-2.2 1.7-2.8 0-6.8-3.5-6.8-6.2 0-.9.4-1.6 1.1-2Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-16">
        <div>
          <a href="#inicio" className="inline-flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
            <Image
              src="/images/icon-TRIBUTEK.svg"
              alt=""
              width={40}
              height={20}
              aria-hidden="true"
              className="h-12 w-12 object-contain"
            />
            <span>TRIBUTEK</span>
          </a>
          <p className="mt-3 max-w-xs text-sm leading-6 text-text-muted">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Labore, perferendis commodi veniam soluta provident.
          </p>
          <nav aria-label="Redes sociales" className="mt-5 flex gap-3">
            {socialLinks.map(({ name, icon }) => (
              <a
                key={name}
                href="#"
                aria-label={name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-primary hover:bg-primary hover:text-white"
              >
                <SocialIcon name={icon} />
              </a>
            ))}
          </nav>
        </div>

        {footerSections.map(({ title, links }) => (
          <section key={title} aria-labelledby={`footer-${title}`}>
            <h2 id={`footer-${title}`} className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-text-muted">
              {links.map((label) => (
                <li key={label}>
                  <a href="#" className="transition-colors hover:text-text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="border-t border-border pt-5 text-xs text-text-muted sm:col-span-2 lg:col-span-4">
          © {new Date().getFullYear()} TRIBUTEK. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
