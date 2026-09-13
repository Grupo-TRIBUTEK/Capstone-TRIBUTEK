"use client";

import { useState } from "react";
import Link from "next/link";
import EmptyState from "../ui/EmptyState";
import Icon from "../ui/Icon";
import { adminNavigation } from "../layout/adminNavigation";

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const indicators = [
  { title: "Clientes activos", detail: "Clientes con servicios vigentes" },
  { title: "Gestiones pendientes", detail: "Trabajo pendiente del período" },
  { title: "Documentos recibidos", detail: "Antecedentes del período" },
  { title: "Próximo vencimiento", detail: "Siguiente fecha por atender" },
];

const shortcuts = adminNavigation.filter((item) => item.href !== "/admin");

export default function AdminOverview() {
  // Período inicial de demostración. Todavía no se consultan datos del backend.
  const [month, setMonth] = useState("8");
  const [year, setYear] = useState("2026");
  const period = `${months[Number(month)]} de ${year}`;
  const selectStyle = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#252f46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46]";

  return (
    <div className="space-y-6 pt-6">
      <div className="rounded-xl border border-[#b98b7b]/40 bg-[#faf5f3] p-4 text-sm leading-6 text-[#252f46]">
        <strong>Vista de demostración.</strong> Puedes explorar el panel y cambiar
        el período. Los indicadores todavía no están conectados a información real.
      </div>

      <section aria-labelledby="overview-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="overview-title" className="text-lg font-semibold text-[#252f46]">Resumen mensual</h2>
            <p aria-live="polite" className="mt-1 text-sm text-slate-600">{period}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Mes
              <select value={month} onChange={(event) => setMonth(event.target.value)} className={selectStyle}>
                {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Año
              <select value={year} onChange={(event) => setYear(event.target.value)} className={selectStyle}>
                {[2025, 2026, 2027].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {indicators.map((indicator) => (
            <div key={indicator.title} className="rounded-xl border border-[#b98b7b]/40 bg-white p-5">
              <dt className="text-sm font-medium text-slate-600">{indicator.title}</dt>
              <dd className="mt-3 text-lg font-semibold text-[#252f46]">Sin datos conectados</dd>
              <dd className="mt-2 text-xs leading-5 text-slate-500">{indicator.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="obligations-title" className="min-w-0 rounded-xl border border-slate-200 p-5">
          <h2 id="obligations-title" className="text-lg font-semibold text-[#252f46]">Obligaciones y vencimientos</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Seguimiento de {period.toLowerCase()}.</p>
          <EmptyState title="Seguimiento pendiente de integrar" description="Aquí podrás consultar el cliente, la gestión, su vencimiento y su estado para el período seleccionado." />
        </section>
        <section aria-labelledby="documents-title" className="rounded-xl border border-slate-200 p-5">
          <h2 id="documents-title" className="mb-5 text-lg font-semibold text-[#252f46]">Documentos recientes</h2>
          <EmptyState title="Documentos pendientes de integrar" description="Este espacio mostrará los antecedentes recibidos durante el período seleccionado." />
        </section>
      </div>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="text-lg font-semibold text-[#252f46]">Accesos a secciones</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">Estas secciones cuentan con una pantalla inicial; sus funciones están en preparación.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {shortcuts.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href} className="rounded-xl border border-slate-200 p-5 transition-colors hover:border-[#b98b7b] hover:bg-[#faf5f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46]">
              <span className="flex items-center gap-3 font-semibold text-[#252f46]"><Icon name={shortcut.icon} />{shortcut.label} <span aria-hidden="true">→</span></span>
              <span className="mt-2 block text-sm text-slate-600">Explorar la sección · En preparación</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
