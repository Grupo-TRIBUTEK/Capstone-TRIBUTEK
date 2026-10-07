"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticatedFetch, clearAuth, getAccessToken } from "@/app/features/auth/auth-client";
import { ClientPaymentFiles } from "@/app/components/management/PaymentFiles";
import "@/app/components/management/management.css";
import Footer from "@/app/components/layout/Footer";

type ClientSummary = {
  id: string;
  nombreRazonSocial: string;
  rut: string;
  emailContacto?: string | null;
  telefono?: string | null;
  estado: string;
};

type PortalData = { nombre: string; clientes: ClientSummary[] };

export default function PortalHome() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPortal() {
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
        if (!response.ok) throw new Error("No fue posible cargar la información de tus clientes.");
        const portalData = (await response.json()) as PortalData;
        if (!cancelled) setData(portalData);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Ocurrió un error al cargar el portal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPortal();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-label font-semibold uppercase tracking-wide text-text-muted">Panel cliente</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">
          {data ? <>Bienvenido{data.nombre && <>, <span className="text-secondary-strong">{data.nombre}</span></>}</> : "Bienvenido a TRIBUTEK"}
        </h1>
        <p className="mt-3 max-w-2xl text-body text-text-muted">Consulta las empresas asociadas a tu cuenta y su información de contacto.</p>

        {loading && <p className="mt-8 text-body-sm text-text-muted" role="status">Cargando tu información...</p>}
        {error && <p className="mt-8 rounded-lg border border-error-border bg-error-surface p-4 text-body-sm text-error" role="alert">{error}</p>}
        {!loading && !error && data?.clientes.length === 0 && (
          <p className="mt-8 rounded-lg border border-border bg-surface p-5 text-body-sm text-text-muted">Tu cuenta aún no tiene clientes asociados. Contacta al equipo TRIBUTEK.</p>
        )}
        {!loading && !error && Boolean(data?.clientes.length) && (
          <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Clientes asociados a tu cuenta">
            {data?.clientes.map((cliente) => (
              <article key={cliente.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{cliente.nombreRazonSocial}</h2>
                    <p className="mt-1 text-body-sm text-text-muted">RUT: {cliente.rut}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-label font-semibold text-text-muted">{cliente.estado}</span>
                </div>
                {(cliente.emailContacto || cliente.telefono) && (
                  <dl className="mt-5 space-y-2 border-t border-border pt-4 text-body-sm">
                    {cliente.emailContacto && <div><dt className="inline text-text-muted">Correo de contacto: </dt><dd className="inline text-text-primary">{cliente.emailContacto}</dd></div>}
                    {cliente.telefono && <div><dt className="inline text-text-muted">Teléfono: </dt><dd className="inline text-text-primary">{cliente.telefono}</dd></div>}
                  </dl>
                )}

              </article>
            ))}
          </section>
        )}

        {data && <ClientPaymentFiles clients={data.clientes} />}
        <section className="mt-12" aria-labelledby="tutoriales-title">
          <div className="max-w-2xl">
            <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">Centro de recursos</p>
            <h2 id="tutoriales-title" className="mt-2 text-2xl font-bold text-text-primary">Presentaciones</h2>
            <p className="mt-2 text-body text-text-muted">Consulta en esta sección las presentaciones informativas disponibles para clientes.</p>
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid md:grid-cols-[1.1fr_1fr]">
            <div className="flex min-h-56 flex-col justify-between bg-gradient-to-br from-[#252f46] via-[#344463] to-[#8b6254] p-6 text-white md:min-h-64 md:p-8">
              <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-label font-semibold uppercase tracking-wide">Presentación destacada</span>
              <div>
                <div aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/15 text-xl">▶</div>
                <p className="text-body-sm text-white/80">Material informativo · TRIBUTEK</p>
                <h3 className="mt-1 text-2xl font-bold">Presentación para clientes</h3>
              </div>
            </div>
            <div className="flex flex-col items-start justify-center p-6 md:p-8">
              <p className="text-body-sm font-semibold text-secondary-strong">Próximamente</p>
              <p className="mt-2 text-body leading-relaxed text-text-muted">Aquí podrás consultar el material de la presentación disponible en el portal.</p>
              <Link href="/cliente/presentaciones" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Ver presentación
              </Link>
            </div>
          </article>

        </section>

        <section id="documentos" className="mt-12 scroll-mt-24" aria-labelledby="portal-futuro-title">
          <div className="max-w-3xl">
            <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">Portal de clientes</p>
            <h2 id="portal-futuro-title" className="mt-2 text-2xl font-bold text-text-primary">Obtener y subir documentos</h2>
            <p className="mt-2 text-body text-text-muted">Accede a tus documentos disponibles y sube respaldos o antecedentes asociados a cada cliente.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-secondary-surface px-3 py-1 text-label font-semibold text-secondary-strong">Documentos</span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Obtener documentos</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-text-muted">Consulta y descarga los antecedentes que la administradora haya dejado disponibles para revisión.</p>
              <Link href="/cliente/documentos/obtener" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Obtener documentos
              </Link>
            </article>
            <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-secondary-surface px-3 py-1 text-label font-semibold text-secondary-strong">Carga</span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Subir documentos</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-text-muted">Adjunta respaldos, comprobantes o antecedentes para cada cliente y período.</p>
              <Link href="/cliente/documentos/subir" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Subir documentos
              </Link>
            </article>
          </div>

          <aside className="mt-6 rounded-xl border border-border bg-surface-muted p-5" aria-label="Privacidad de la información">
            <h3 className="font-semibold text-text-primary">Tu información</h3>
            <p className="mt-1 text-body-sm leading-relaxed text-text-muted">El portal muestra la información de los clientes vinculados a tu cuenta y permite gestionar la documentación asociada.</p>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
