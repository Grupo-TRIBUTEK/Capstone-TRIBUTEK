"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authenticatedFetch,
  clearAuth,
  getAccessToken,
} from "@/app/features/auth/auth-client";

export default function PresentacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        {/* Encabezado de la página */}
        <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">
          Centro de recursos
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary md:text-4xl">
          Presentaciones
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-muted">
          Revisa el material informativo que TRIBUTEK prepara para sus clientes, organizado por área de asesoramiento.
        </p>

        {/* Estado de carga y errores */}
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

        {/* Presentaciones agrupadas por categoría */}
        {!loading && !error && (
          <section className="mt-8" aria-labelledby="asesoramiento-title">
            <div className="mb-5">
              <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">Categoría</p>
              <h2 id="asesoramiento-title" className="mt-1 font-display text-2xl font-bold text-text-primary">
                Asesoramiento TRIBUTEK
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {[
                { category: "Asesoría tributaria", title: "Planificación tributaria" },
                { category: "Gestión contable", title: "Contabilidad para tu negocio" },
              ].map((presentation, index) => (
                <article key={presentation.title} className="presentation-card overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="flex min-h-44 flex-col justify-between bg-primary p-6 text-white">
                    <span className="inline-flex w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-label font-semibold uppercase tracking-wide">
                      {presentation.category}
                    </span>
                    <div>
                      <p className="text-body-sm text-white/75">Presentación {String(index + 1).padStart(2, "0")}</p>
                      <h3 className="mt-1 font-display text-2xl font-bold">{presentation.title}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body-sm text-text-muted">El contenido y el archivo se publicarán próximamente.</p>
                    <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-body-sm font-semibold text-text-muted">
                      En preparación
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Pie de página */}
      <footer className="mt-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-body-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-text-primary">TRIBUTEK · Portal de clientes</p>
          <p>Material de apoyo para clientes TRIBUTEK.</p>
          <p className="text-label">© {new Date().getFullYear()} TRIBUTEK</p>
        </div>
      </footer>
    </div>
  );
}
