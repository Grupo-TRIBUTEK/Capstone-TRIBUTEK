"use client";

import { useMemo, useState } from "react";
import Footer from "@/app/components/layout/Footer";

type DocumentStatus = "Todos" | "Pendientes" | "En revisión" | "Recibidos";

type DocumentItem = {
  id: number;
  name: string;
  type: string;
  period: string;
  status: Exclude<DocumentStatus, "Todos">;
};

const FILTERS: DocumentStatus[] = ["Todos", "Pendientes", "En revisión", "Recibidos"];

const documentsSeed: DocumentItem[] = [
  {
    id: 1,
    name: "F29 septiembre",
    type: "Declaración",
    period: "Sep. 2026",
    status: "En revisión",
  },
];

export default function ObtenerDocumentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>("Todos");
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedPeriod, setSelectedPeriod] = useState("Todos");

  const documentTypes = ["Todos", ...new Set(documentsSeed.map((document) => document.type))];
  const periods = ["Todos", ...new Set(documentsSeed.map((document) => document.period))];

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return documentsSeed.filter((document) => {
      const matchesStatus = selectedStatus === "Todos" || document.status === selectedStatus;
      const matchesType = selectedType === "Todos" || document.type === selectedType;
      const matchesPeriod = selectedPeriod === "Todos" || document.period === selectedPeriod;
      const matchesQuery = normalizedQuery.length === 0 ||
        document.name.toLowerCase().includes(normalizedQuery) ||
        document.type.toLowerCase().includes(normalizedQuery) ||
        document.period.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesType && matchesPeriod && matchesQuery;
    });
  }, [searchTerm, selectedStatus, selectedType, selectedPeriod]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="max-w-3xl">
          <p className="text-label font-semibold uppercase tracking-[0.16em] text-secondary-strong">Documentos</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Consultar documentos</h1>
          <p className="mt-3 text-body text-text-muted">Busca y filtra los documentos disponibles para tu cuenta.</p>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border pb-5">
            <label className="relative block w-full">
              <span className="sr-only">Buscar documento</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar documento..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-body-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">⌕</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="sr-only">Filtrar por estado</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value as DocumentStatus)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  aria-label="Filtrar por estado"
                >
                  {FILTERS.map((option) => (
                    <option key={option} value={option}>{option === "Todos" ? "Estado" : option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Filtrar por tipo de documento</span>
                <select
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  aria-label="Filtrar por tipo de documento"
                >
                  {documentTypes.map((option) => (
                    <option key={option} value={option}>{option === "Todos" ? "Tipo de documento" : option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Filtrar por período</span>
                <select
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  aria-label="Filtrar por período"
                >
                  {periods.map((option) => (
                    <option key={option} value={option}>{option === "Todos" ? "Período" : option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-body-sm">
                <thead className="bg-surface-muted text-label font-semibold uppercase tracking-[0.12em] text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">Documento</th>
                    <th scope="col" className="px-4 py-3">Tipo</th>
                    <th scope="col" className="px-4 py-3">Período</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((document) => (
                      <tr key={document.id} className="bg-surface">
                        <th scope="row" className="px-4 py-4 font-semibold text-text-primary">{document.name}</th>
                        <td className="px-4 py-4 text-text-muted">{document.type}</td>
                        <td className="px-4 py-4 text-text-primary">{document.period}</td>
                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-label font-semibold",
                              document.status === "Pendientes" && "bg-warning-surface text-warning",
                              document.status === "En revisión" && "bg-secondary-surface text-secondary-strong",
                              document.status === "Recibidos" && "bg-success-surface text-success",
                            ].join(" ")}
                          >
                            {document.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled
                            title="El registro es ficticio y no tiene un archivo adjunto."
                            className="whitespace-nowrap font-semibold text-text-muted disabled:cursor-not-allowed"
                          >
                            Ver documento
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="bg-surface px-4 py-10 text-center text-body-sm text-text-muted">
                        No se encontraron documentos para la búsqueda y filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
