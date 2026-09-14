"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Icon from "../../components/ui/Icon";
import ClientCreateModal, { type ClientRecord } from "../../components/features/clientes/ClientCreateModal";

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  function handleCreated(client: ClientRecord) {
    setClients((current) => [...current, client]);
    setSuccessMessage("Cliente creado correctamente.");
  }

  return (
    <main className="relative space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-2 rounded text-sm font-medium text-[#735044] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
        <Icon name="home" /> Volver al panel principal
      </Link>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#efe0da] text-[#735044]"><Icon name="users" className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><Header title="Clientes" description="Ficha y seguimiento de los clientes de TRIBUTEK." /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#b98b7b]/40 bg-[#faf5f3] p-4">
        <p className="max-w-xl text-sm leading-6 text-[#252f46]">Administra las fichas, datos de contacto y estado de los clientes.</p>
        <button type="button" onClick={() => { setSuccessMessage(""); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white hover:bg-[#344463] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46]"><Icon name="plus" />Nuevo cliente</button>
      </div>
      {successMessage && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800" role="status">{successMessage}</p>}
      <dl className="grid gap-4 sm:grid-cols-3">
        <Metric label="Clientes registrados" value={clients.length} />
        <Metric label="Servicios vigentes" value="Pendiente" />
        <Metric label="Clientes con pendientes" value="Pendiente" />
      </dl>
      <section aria-labelledby="clients-list-title" className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 p-5"><h2 id="clients-list-title" className="font-semibold text-[#252f46]">Clientes registrados</h2><p className="mt-1 text-sm text-slate-600">Consulta los clientes creados desde este panel.</p></div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de clientes">
          <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#252f46] text-white"><tr>{["Cliente / razón social", "RUT", "Contacto", "Estado"].map((column) => <th key={column} scope="col" className="px-5 py-4 font-medium">{column}</th>)}</tr></thead>
            <tbody>{clients.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-600">Las fichas de clientes aparecerán aquí cuando se creen.</td></tr> : clients.map((client) => <tr key={client.id} className="border-t border-slate-200"><td className="px-5 py-4 font-medium text-[#252f46]">{client.nombreRazonSocial}</td><td className="px-5 py-4">{client.rut}</td><td className="px-5 py-4">{client.contactoPrincipal || client.emailContacto || "-"}</td><td className="px-5 py-4">{client.estado}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      {isModalOpen && <ClientCreateModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-3 font-semibold text-[#252f46]">{value}</dd></div>;
}
