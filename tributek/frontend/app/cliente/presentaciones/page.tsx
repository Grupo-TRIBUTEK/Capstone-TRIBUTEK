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
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary-strong">
          Centro de recursos
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary md:text-4xl">
          Presentaciones
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-text-muted">
          Revisa el material informativo que TRIBUTEK prepara para sus clientes.
        </p>

        {loading && (
          <p className="mt-8 text-sm text-text-muted" role="status">
            Validando tu sesión…
          </p>
        )}
        {error && (
          <p
            className="mt-8 rounded-lg border border-error-border bg-error-surface p-4 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {!loading && !error && (
          <section className="mt-8 max-w-3xl" aria-label="Presentación disponible">
            <article className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex min-h-44 items-center justify-center bg-primary px-6 py-8 text-center text-white">
                <div>
                  <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    Presentación 01
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold">
                    Material TRIBUTEK
                  </h2>
                </div>
              </div>
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                <div>
                  <p className="font-semibold text-text-primary">
                    Presentación para clientes
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    El tema y el archivo se definirán más adelante.
                  </p>
                </div>
                <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-sm font-semibold text-text-muted">
                  En preparación
                </span>
              </div>
            </article>
          </section>
        )}
      </main>

      <footer className="mt-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-text-primary">TRIBUTEK · Portal de clientes</p>
          <p>Material de apoyo para clientes TRIBUTEK.</p>
          <p className="text-xs">© {new Date().getFullYear()} TRIBUTEK</p>
        </div>
      </footer>
    </div>
  );
}
