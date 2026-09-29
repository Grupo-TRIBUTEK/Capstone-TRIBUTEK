"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch, clearAuth, getAccessToken } from "@/app/features/auth/auth-client";

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

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-subtle">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TRIBUTEK</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">Portal de clientes</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface-muted">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Panel cliente</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">
          {data ? <>Bienvenido{data.nombre && <>, <span className="text-[#8b6254]">{data.nombre}</span></>}</> : "Bienvenido a TRIBUTEK"}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">Consulta las empresas asociadas a tu cuenta y su información de contacto.</p>

        {loading && <p className="mt-8 text-sm text-slate-600" role="status">Cargando tu información...</p>}
        {error && <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
        {!loading && !error && data?.clientes.length === 0 && (
          <p className="mt-8 rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">Tu cuenta aún no tiene clientes asociados. Contacta al equipo TRIBUTEK.</p>
        )}
        {!loading && !error && Boolean(data?.clientes.length) && (
          <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Clientes asociados a tu cuenta">
            {data?.clientes.map((cliente) => (
              <article key={cliente.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{cliente.nombreRazonSocial}</h2>
                    <p className="mt-1 text-sm text-slate-600">RUT: {cliente.rut}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{cliente.estado}</span>
                </div>
                {(cliente.emailContacto || cliente.telefono) && (
                  <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    {cliente.emailContacto && <div><dt className="inline text-slate-500">Correo de contacto: </dt><dd className="inline text-slate-800">{cliente.emailContacto}</dd></div>}
                    {cliente.telefono && <div><dt className="inline text-slate-500">Teléfono: </dt><dd className="inline text-slate-800">{cliente.telefono}</dd></div>}
                  </dl>
                )}
              </article>
            ))}
          </section>
        )}

        <section className="mt-12" aria-labelledby="tutoriales-title">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8b6254]">Centro de recursos</p>
            <h2 id="tutoriales-title" className="mt-2 text-2xl font-bold text-[#252f46]">Tutoriales y presentaciones</h2>
            <p className="mt-2 text-slate-600">Material visual y guías breves para ayudarte a usar los servicios de TRIBUTEK. Las presentaciones de Canva se podrán abrir desde aquí.</p>
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid md:grid-cols-[1.1fr_1fr]">
            <div className="flex min-h-56 flex-col justify-between bg-gradient-to-br from-[#252f46] via-[#344463] to-[#8b6254] p-6 text-white md:min-h-64 md:p-8">
              <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Presentación destacada</span>
              <div>
                <div aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/15 text-xl">▶</div>
                <p className="text-sm text-white/80">Canva · Servicios para clientes</p>
                <h3 className="mt-1 text-2xl font-bold">Asesorías para tu empresa</h3>
              </div>
            </div>
            <div className="flex flex-col items-start justify-center p-6 md:p-8">
              <p className="text-sm font-semibold text-[#8b6254]">Próximamente</p>
              <p className="mt-2 leading-relaxed text-slate-600">Aquí podrás ver una presentación sobre la gestión mensual, la formalización y las asesorías que TRIBUTEK ofrece a sus clientes.</p>
              <button type="button" disabled className="mt-5 cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500" aria-label="Presentación de Canva próximamente">
                Presentación en preparación
              </button>
            </div>
          </article>

        </section>

        <section className="mt-12" aria-labelledby="portal-futuro-title">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8b6254]">Propuesta de futuras funciones</p>
            <h2 id="portal-futuro-title" className="mt-2 text-2xl font-bold text-[#252f46]">Lo que podr&aacute;s hacer en el portal</h2>
            <p className="mt-2 text-slate-600">El portal podr&aacute; reunir tus antecedentes y el seguimiento de tus solicitudes en un solo lugar. Estas funciones son informativas y se incorporar&iacute;an en una etapa futura.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-secondary-surface px-3 py-1 text-xs font-semibold text-secondary-strong">Documentos</span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Entrega y consulta de antecedentes</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Podr&aacute;s cargar los documentos solicitados y consultar o descargar los que la Administradora habilite para tu cuenta.</p>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">Por habilitar</button>
            </article>
            <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-secondary-surface px-3 py-1 text-xs font-semibold text-secondary-strong">Seguimiento</span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Solicitudes y vencimientos</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Podr&aacute;s consultar gestiones, observaciones y fechas importantes. La Administradora gestionar&aacute; los estados y las revisiones.</p>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">Por habilitar</button>
            </article>
            <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-secondary-surface px-3 py-1 text-xs font-semibold text-secondary-strong">Privacidad</span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Acceso solo a tu informaci&oacute;n</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Cada cliente consultar&aacute; solo la informaci&oacute;n y los archivos asociados a su cuenta que hayan sido habilitados por TRIBUTEK.</p>
              <button type="button" disabled className="mt-4 cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">Por habilitar</button>
            </article>
          </div>

          
        </section>
      </main>
      <footer className="mt-10 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-text-primary">TRIBUTEK · Portal de clientes</p>
          <p>Para consultas o asesorías, contacta al equipo por el canal habitual.</p>
          <p className="text-xs">© {new Date().getFullYear()} TRIBUTEK</p>
        </div>
      </footer>
    </div>
  );
}
