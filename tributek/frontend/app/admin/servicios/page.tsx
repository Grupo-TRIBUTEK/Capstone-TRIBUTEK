"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Icon from "../../components/ui/Icon";
import { authenticatedFetch } from "../../features/auth/auth-client";

type Servicio = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

type Cliente = {
  id: string;
  nombreRazonSocial: string;
  rut: string;
};

type Asignacion = {
  id: string;
  clienteId: string;
  servicioId: string;
  fechaInicio?: string | null;
  fechaTermino?: string | null;
  estado: string;
  cliente?: Cliente | null;
  servicio?: Servicio | null;
};

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#252f46] focus:border-[#735044] focus:outline-none focus:ring-2 focus:ring-[#ead8d0]";

const emptyService = { nombre: "", descripcion: "", activo: true };

export default function Page() {
  const [services, setServices] = useState<Servicio[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [assignments, setAssignments] = useState<Asignacion[]>([]);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [editingService, setEditingService] = useState<Servicio | null>(null);
  const [assignmentToFinish, setAssignmentToFinish] = useState<Asignacion | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    clienteId: "",
    servicioId: "",
    fechaInicio: "",
    fechaTermino: "",
    estado: "ACTIVO",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [servicesResponse, clientsResponse, assignmentsResponse] = await Promise.all([
        authenticatedFetch("/servicios"),
        authenticatedFetch("/clientes"),
        authenticatedFetch("/servicios/asignaciones"),
      ]);

      if (!servicesResponse.ok || !clientsResponse.ok || !assignmentsResponse.ok) {
        throw new Error("No se pudo cargar la información de servicios.");
      }

      const loadedServices = (await servicesResponse.json()) as Servicio[];
      const loadedClients = (await clientsResponse.json()) as Cliente[];
      const loadedAssignments = (await assignmentsResponse.json()) as Asignacion[];

      setServices(loadedServices);
      setClients(loadedClients);
      setAssignments(loadedAssignments);
      setAssignmentForm((current) => ({
        ...current,
        clienteId: current.clienteId || loadedClients[0]?.id || "",
        servicioId: current.servicioId || loadedServices[0]?.id || "",
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(loadTask);
  }, []);

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await authenticatedFetch(
        editingService ? `/servicios/${editingService.id}` : "/servicios",
        {
          method: editingService ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceForm),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "No se pudo guardar el servicio.");
      }

      setMessage(editingService ? "Servicio actualizado correctamente." : "Servicio creado correctamente.");
      setServiceForm(emptyService);
      setEditingService(null);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await authenticatedFetch("/servicios/asignaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentForm),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "No se pudo asociar el servicio.");
      }

      setMessage("Servicio asociado correctamente.");
      setAssignmentForm((current) => ({
        ...current,
        fechaInicio: "",
        fechaTermino: "",
      }));
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo asociar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  async function finishAssignment(assignment: Asignacion) {
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await authenticatedFetch(`/servicios/asignaciones/${assignment.id}/finalizar`, {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("No se pudo actualizar la contratación.");
      setMessage("Contratación finalizada.");
      await loadData();
      setAssignmentToFinish(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la contratación.");
    } finally {
      setSaving(false);
    }
  }

  function editService(service: Servicio) {
    setEditingService(service);
    setServiceForm({
      nombre: service.nombre,
      descripcion: service.descripcion ?? "",
      activo: service.activo,
    });
    setMessage("");
  }

  return (
    <main className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-2 rounded text-sm font-medium text-[#735044] underline-offset-4 hover:underline">
        <Icon name="home" /> Volver al panel principal
      </Link>
      <Header title="Servicios" description="Administra el catálogo y las contrataciones asociadas a cada cliente." />

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-600">Servicios disponibles</dt><dd className="mt-2 text-2xl font-semibold text-[#252f46]">{services.filter((service) => service.activo).length}</dd></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-600">Contrataciones activas</dt><dd className="mt-2 text-2xl font-semibold text-[#252f46]">{assignments.filter((assignment) => assignment.estado === "ACTIVO").length}</dd></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-600">Clientes asociados</dt><dd className="mt-2 text-2xl font-semibold text-[#252f46]">{new Set(assignments.map((assignment) => assignment.clienteId)).size}</dd></div>
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="catalog-title">
          <div className="mb-5"><h2 id="catalog-title" className="text-xl font-bold text-[#252f46]">Catálogo de servicios</h2><p className="mt-1 text-sm text-slate-600">Define los servicios que ofrece TRIBUTEK.</p></div>
          <form onSubmit={saveService} className="space-y-4">
            <label className="block text-sm font-semibold text-[#252f46]">Nombre<input className={inputClass} value={serviceForm.nombre} onChange={(event) => setServiceForm({ ...serviceForm, nombre: event.target.value })} required maxLength={100} /></label>
            <label className="block text-sm font-semibold text-[#252f46]">Descripción<textarea className={`${inputClass} h-24 py-3`} value={serviceForm.descripcion} onChange={(event) => setServiceForm({ ...serviceForm, descripcion: event.target.value })} maxLength={250} /></label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#252f46]"><input type="checkbox" checked={serviceForm.activo} onChange={(event) => setServiceForm({ ...serviceForm, activo: event.target.checked })} /> Disponible para contratar</label>
            <div className="flex flex-wrap gap-3"><button type="submit" disabled={saving} className="rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{editingService ? "Guardar cambios" : "Agregar servicio"}</button>{editingService && <button type="button" onClick={() => { setEditingService(null); setServiceForm(emptyService); }} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-[#252f46]">Cancelar</button>}</div>
          </form>
          <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b border-slate-200"><tr>{["Servicio", "Estado", "Acción"].map((heading) => <th key={heading} className="p-3 font-semibold text-[#252f46]">{heading}</th>)}</tr></thead><tbody>{services.map((service) => <tr key={service.id} className="border-b border-slate-100"><td className="p-3"><strong>{service.nombre}</strong><span className="block text-xs text-slate-500">{service.descripcion || "Sin descripción"}</span></td><td className="p-3">{service.activo ? "Disponible" : "Inactivo"}</td><td className="p-3"><button type="button" onClick={() => editService(service)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#252f46]">Editar</button></td></tr>)}</tbody></table>{!loading && services.length === 0 && <p className="p-4 text-sm text-slate-600">Todavía no hay servicios registrados.</p>}</div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="assignment-title">
          <div className="mb-5"><h2 id="assignment-title" className="text-xl font-bold text-[#252f46]">Asociar servicio</h2><p className="mt-1 text-sm text-slate-600">Registra qué servicio tiene cada cliente y durante qué período.</p></div>
          <form onSubmit={saveAssignment} className="space-y-4">
            <label className="block text-sm font-semibold text-[#252f46]">Cliente<select className={inputClass} value={assignmentForm.clienteId} onChange={(event) => setAssignmentForm({ ...assignmentForm, clienteId: event.target.value })} required><option value="">Selecciona un cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombreRazonSocial} ({client.rut})</option>)}</select></label>
            <label className="block text-sm font-semibold text-[#252f46]">Servicio<select className={inputClass} value={assignmentForm.servicioId} onChange={(event) => setAssignmentForm({ ...assignmentForm, servicioId: event.target.value })} required><option value="">Selecciona un servicio</option>{services.filter((service) => service.activo).map((service) => <option key={service.id} value={service.id}>{service.nombre}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#252f46]">Inicio<input className={inputClass} type="date" value={assignmentForm.fechaInicio} onChange={(event) => setAssignmentForm({ ...assignmentForm, fechaInicio: event.target.value })} /></label><label className="block text-sm font-semibold text-[#252f46]">Término<input className={inputClass} type="date" value={assignmentForm.fechaTermino} onChange={(event) => setAssignmentForm({ ...assignmentForm, fechaTermino: event.target.value })} /></label></div>
            <label className="block text-sm font-semibold text-[#252f46]">Estado<select className={inputClass} value={assignmentForm.estado} onChange={(event) => setAssignmentForm({ ...assignmentForm, estado: event.target.value })}><option>ACTIVO</option><option>SUSPENDIDO</option><option>FINALIZADO</option></select></label>
            <button type="submit" disabled={saving || !clients.length || !services.length} className="rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">Asociar servicio</button>
          </form>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="contracts-title">
        <div className="border-b border-slate-200 p-5"><h2 id="contracts-title" className="text-xl font-bold text-[#252f46]">Contrataciones</h2><p className="mt-1 text-sm text-slate-600">Vigencia y estado de los servicios contratados por cliente.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#252f46] text-white"><tr>{["Cliente", "Servicio", "Inicio", "Término", "Estado", "Acción"].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead><tbody>{assignments.map((assignment) => <tr key={assignment.id} className="border-b border-slate-100"><td className="px-5 py-4">{assignment.cliente?.nombreRazonSocial || "Cliente no disponible"}</td><td className="px-5 py-4">{assignment.servicio?.nombre || "Servicio no disponible"}</td><td className="px-5 py-4">{assignment.fechaInicio?.slice(0, 10) || "-"}</td><td className="px-5 py-4">{assignment.fechaTermino?.slice(0, 10) || "Sin término"}</td><td className="px-5 py-4">{assignment.estado}</td><td className="px-5 py-4">{assignment.estado === "ACTIVO" && <button type="button" onClick={() => setAssignmentToFinish(assignment)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#252f46]">Finalizar</button>}</td></tr>)}</tbody></table>{!loading && assignments.length === 0 && <p className="p-6 text-center text-sm text-slate-600">No hay contrataciones registradas.</p>}</div>
      </section>

      {assignmentToFinish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-assignment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => !saving && setAssignmentToFinish(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="finish-assignment-title" className="text-lg font-semibold text-[#252f46]">
              ¿Finalizar servicio?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Finalizarás “{assignmentToFinish.servicio?.nombre || "este servicio"}” para {assignmentToFinish.cliente?.nombreRazonSocial || "este cliente"}. Esta acción cambiará su estado a finalizado.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAssignmentToFinish(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#252f46] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishAssignment(assignmentToFinish)}
                className="rounded-lg bg-[#252f46] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344463] disabled:opacity-50"
              >
                {saving ? "Finalizando…" : "Confirmar finalización"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section aria-labelledby="next-title">
        <h2 id="next-title" className="mb-4 font-semibold text-[#252f46]">Qué encontrarás en esta sección</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-[#252f46]">Catálogo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Servicios que ofrece TRIBUTEK y su descripción.</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-[#252f46]">Contrataciones</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Asociación de servicios a clientes y seguimiento de su vigencia.</p>
          </article>
        </div>
      </section>

      <nav aria-label="Secciones relacionadas" className="flex flex-wrap gap-3">
        <Link href="/admin/clientes" className="rounded-lg border border-[#b98b7b] px-4 py-3 text-sm font-medium text-[#252f46] hover:bg-[#faf5f3]">Clientes<span aria-hidden="true"> →</span></Link>
        <Link href="/admin/seguimiento" className="rounded-lg border border-[#b98b7b] px-4 py-3 text-sm font-medium text-[#252f46] hover:bg-[#faf5f3]">Seguimiento mensual<span aria-hidden="true"> →</span></Link>
      </nav>
    </main>
  );
}
