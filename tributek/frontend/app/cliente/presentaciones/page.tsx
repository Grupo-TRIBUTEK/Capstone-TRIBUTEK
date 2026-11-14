"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  authenticatedFetch,
  clearAuth,
  getAccessToken,
} from "@/app/features/auth/auth-client";

type AdvisoryPdf = {
  id: string;
  file: string;
  type: string;
  title: string;
  description: string;
  category: string;
};

const advisoryPdfs: AdvisoryPdf[] = [
  {
    id: "e-boletas",
    file: "/documentos/asesorias/TUTORIAL E-BOLETAS.pdf",
    type: "Tutorial e-boletas",
    title: "Emisión y gestión de e-boletas",
    description: "Guía para emitir y revisar boletas electrónicas.",
    category: "Ventas y boletas",
  },
  {
    id: "reporte-mercado-pago",
    file: "/documentos/asesorias/TUTORIAL DESCARGAR REPORTE MERCADO PAGO.pdf",
    type: "Tutorial reporte Mercado Pago",
    title: "Descarga de reporte de Mercado Pago",
    description: "Guía para obtener el reporte de movimientos y ventas.",
    category: "Medios de pago y reportes",
  },
  {
    id: "firma-estatutos",
    file: "/documentos/asesorias/TUTORIAL FIRMA ESTATUTOS VIRTUAL.pdf",
    type: "Tutorial firma de estatutos",
    title: "Firma virtual de estatutos",
    description: "Guía para completar la firma virtual de estatutos.",
    category: "Constitución y formalización",
  },
  {
    id: "firma-notaria",
    file: "/documentos/asesorias/TUTORIAL FIRMA NOTARIA VIRTUAL.pdf",
    type: "Tutorial firma notaría virtual",
    title: "Firma virtual en notaría",
    description: "Guía para el proceso de firma notarial virtual.",
    category: "Constitución y formalización",
  },
];

export default function PresentacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sections = useMemo(() => {
    const grouped = new Map<string, AdvisoryPdf[]>();
    for (const pdf of advisoryPdfs) {
      const current = grouped.get(pdf.category) ?? [];
      current.push(pdf);
      grouped.set(pdf.category, current);
    }
    return Array.from(grouped, ([category, items]) => ({ category, items }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function validarSesion() {
      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }
      try {
        const response = await authenticatedFetch("/clientes/mis-clientes");
        if (response.status === 401 || response.status === 403) {
          clearAuth();
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("No se pudo validar el acceso al portal.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la sección.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void validarSesion();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:py-14">
        <Link
          href="/cliente"
          className="mb-6 inline-flex items-center gap-2 text-body-sm font-semibold text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">←</span>
          Volver al panel
        </Link>
        <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">
          Centro de recursos
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary md:text-4xl">
          Presentaciones
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-muted">
          Consulta el material informativo y los tutoriales en PDF disponibles para
          clientes, organizados por categoría.
        </p>

        {loading && (
          <p className="mt-8 text-body-sm text-text-muted" role="status">
            Validando tu sesión…
          </p>
        )}
        {error && (
          <p
            className="mt-8 rounded-lg border border-error-border bg-error-surface p-4 text-body-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <section key={section.category} aria-labelledby={`cat-${section.category.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="mb-5">
                  <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">
                    Categoría
                  </p>
                  <h2
                    id={`cat-${section.category.replace(/\s+/g, "-").toLowerCase()}`}
                    className="mt-1 font-display text-2xl font-bold text-text-primary"
                  >
                    {section.category}
                  </h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {section.items.map((pdf, index) => (
                    <article
                      key={pdf.id}
                      data-pdf-type={pdf.type}
                      className="presentation-card overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="flex min-h-44 flex-col justify-between bg-primary p-6 text-white">
                        <span className="inline-flex w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-label font-semibold uppercase tracking-wide">
                          PDF · {pdf.type}
                        </span>
                        <div>
                          <p className="text-body-sm text-white/75">
                            Presentación {String(index + 1).padStart(2, "0")}
                          </p>
                          <h3 className="mt-1 font-display text-2xl font-bold">
                            {pdf.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 p-6">
                        <p className="text-body-sm text-text-muted">{pdf.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={pdf.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            Ver presentación
                          </a>
                          <a
                            href={pdf.file}
                            download
                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-body-sm font-semibold text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            Descargar PDF
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-body-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-text-primary">TRIBUTEK - Portal de clientes</p>
          <p>Material de apoyo para clientes TRIBUTEK.</p>
          <p className="text-label">© {new Date().getFullYear()} TRIBUTEK</p>
        </div>
      </footer>
    </div>
  );
}
