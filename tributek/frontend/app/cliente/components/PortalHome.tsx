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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TRIBUTEK</p>
            <p className="mt-1 text-sm font-semibold text-[#252f46]">Portal de clientes</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#252f46] hover:bg-slate-50">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Panel cliente</p>
        <h1 className="mt-2 text-3xl font-bold text-[#252f46]">
          {data ? `Bienvenido${data.nombre ? `, ${data.nombre}` : ""}` : "Bienvenido a TRIBUTEK"}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">Consulta las empresas asociadas a tu cuenta y su información de contacto.</p>

        {loading && <p className="mt-8 text-sm text-slate-600" role="status">Cargando tu información...</p>}
        {error && <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
        {!loading && !error && data?.clientes.length === 0 && (
          <p className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Tu cuenta aún no tiene clientes asociados. Contacta al equipo TRIBUTEK.</p>
        )}
        {!loading && !error && Boolean(data?.clientes.length) && (
          <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Clientes asociados a tu cuenta">
            {data?.clientes.map((cliente) => (
              <article key={cliente.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#252f46]">{cliente.nombreRazonSocial}</h2>
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
      </main>
    </div>
  );
}
