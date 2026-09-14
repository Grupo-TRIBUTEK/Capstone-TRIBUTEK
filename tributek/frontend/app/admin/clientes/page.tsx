"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Icon from "../../components/ui/Icon";
import ClientCreateModal, {
  type ClientRecord,
} from "../../components/features/clientes/ClientCreateModal";
import MonthlyWorkspace from "../../components/ficha/MonthlyWorkspace";
import { persist, useData, syncRemoteClients } from "../../components/ficha/store";
import { authenticatedFetch } from "@/app/features/auth/auth-client";

type ServiceAssignment = {
  clienteId: string;
  estado: string;
  servicio?: { nombre: string } | null;
};

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | undefined>();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignment[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const fichaStore = useData();
  const [fichaWarning, setFichaWarning] = useState("");
  const [loadError,setLoadError] = useState("");
  const [loading,setLoading] = useState(true);
  const [reloadKey,setReloadKey] = useState(0);

  useEffect(() => {
    if (!fichaStore.ready) return;
    const controller = new AbortController();
    async function cargarClientes() {
      setLoading(true); setLoadError('');
      try {
        const [response, assignmentsResponse] = await Promise.all([
          authenticatedFetch('/clientes', {signal:controller.signal}),
          authenticatedFetch('/servicios/asignaciones', {signal:controller.signal}),
        ]);
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Tu sesión no tiene acceso al listado. Vuelve a iniciar sesión.' : 'No se pudieron obtener los clientes.');
        const data: ClientRecord[] = await response.json();
        const assignments: ServiceAssignment[] = assignmentsResponse.ok
          ? await assignmentsResponse.json()
          : [];
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error('Respuesta de clientes inválida.');
        setClients(data);
        setServiceAssignments(Array.isArray(assignments) ? assignments : []);
        try { syncRemoteClients(data); setFichaWarning(''); }
        catch { setFichaWarning('El listado está cargado, pero no se pudieron preparar las fichas locales. Tus datos locales se conservaron.'); }
      } catch(error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el listado.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }

    void cargarClientes();
    return () => controller.abort();
  }, [fichaStore.ready, reloadKey]);

  function handleSaved(client: ClientRecord) {
  setClients((current) => {
    const exists = current.some((currentClient) => currentClient.id === client.id);
    return exists
      ? current.map((currentClient) => currentClient.id === client.id ? client : currentClient)
      : [...current, client];
  });
  setSuccessMessage(editingClient ? "Cliente actualizado correctamente." : "Cliente creado correctamente.");
  setFichaWarning("");

  if (!fichaStore.ready || fichaStore.error) {
    setFichaWarning(
      "El cliente fue creado, pero la ficha mensual local no estaba disponible.",
    );
    return;
  }

  const fichaClient = {
    id: String(client.id),
    name: client.nombreRazonSocial,
    phone: client.telefono ?? "",
    note: "",
    documentUrl: "",
  };

  const existingFichaClient = fichaStore.data.clients.find(
    (current) => current.id === fichaClient.id,
  );

  if (existingFichaClient && editingClient) {
    try {
      persist(
        {
          ...fichaStore.data,
          clients: fichaStore.data.clients.map((current) =>
            current.id === fichaClient.id ? { ...current, name: fichaClient.name, phone: fichaClient.phone } : current,
          ),
        },
        fichaStore.data.revision,
      );
    } catch {
      setFichaWarning("El cliente se actualizó, pero no se pudo actualizar la ficha local.");
    }
    return;
  }

  if (existingFichaClient) return;

  try {
    persist(
      {
        ...fichaStore.data,
        clients: [...fichaStore.data.clients, fichaClient],
      },
      fichaStore.data.revision,
    );
  } catch {
    setFichaWarning(
      "El cliente fue creado en TRIBUTEK, pero no se pudo agregar a la ficha mensual local.",
    );
  }
}

  return (
    <main className="relative space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 rounded text-sm font-medium text-[#735044] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <Icon name="home" /> Volver al panel principal
      </Link>

      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#efe0da] text-[#735044]">
          <Icon name="users" className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <Header
            title="Clientes y ficha mensual"
            description="Revisa los conceptos, el trabajo, los contactos y los clientes de TRIBUTEK."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#b98b7b]/40 bg-[#faf5f3] p-4">
        <p className="max-w-xl text-sm leading-6 text-[#252f46]">
          Administra las fichas, datos de contacto y estado de los clientes.
        </p>

        <button
          type="button"
          onClick={() => {
            setSuccessMessage("");
            setEditingClient(undefined);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white hover:bg-[#344463] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46]"
        >
          <Icon name="plus" />
          Nuevo cliente
        </button>
      </div>

      {successMessage && (
        <p
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          role="status"
        >
          {successMessage}
        </p>
      )}
      {fichaWarning && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
          role="status"
        >
          {fichaWarning}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="button" disabled={loading} onClick={()=>setReloadKey(key=>key+1)} className="rounded-lg border p-3 disabled:opacity-50">Actualizar clientes</button>
        {loading && <p role="status">Cargando clientes…</p>}
        {loadError && <p role="alert" className="text-red-700">{loadError}</p>}
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Metric label="Clientes registrados" value={loading || loadError ? "Sin confirmar" : clients.length} />
        <Metric label="Servicios vigentes" value="Pendiente" />
        <Metric label="Clientes con pendientes" value="Pendiente" />
      </dl>

      <section
        aria-labelledby="clients-list-title"
        className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
      >
        <div className="border-b border-slate-200 p-5">
          <h2
            id="clients-list-title"
            className="font-semibold text-[#252f46]"
          >
            Clientes registrados
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Consulta los clientes creados desde este panel.
          </p>
        </div>

        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Tabla de clientes"
        >
          <table className="w-full min-w-[880px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-[#252f46] text-white">
              <tr>
                {[
                  "Cliente / razón social",
                  "RUT",
                  "Contacto",
                  "Servicio",
                  "Estado",
                  "Acciones",
                ].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-5 py-4 font-medium"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-600"
                  >
                    {loading ? "Cargando clientes…" : loadError ? "No se pudo confirmar el listado. Usa Actualizar clientes para reintentar." : "No hay clientes registrados."}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-5 py-4 font-medium text-[#252f46]">
                      {client.nombreRazonSocial}
                    </td>
                    <td className="px-5 py-4">{client.rut}</td>
                    <td className="px-5 py-4">
                      {client.contactoPrincipal ||
                        client.emailContacto ||
                        "-"}
                    </td>
                    <td className="px-5 py-4">
                      <ClientServices
                        names={serviceAssignments
                          .filter(
                            (assignment) =>
                              String(assignment.clienteId) === String(client.id) &&
                              assignment.estado === "ACTIVO",
                          )
                          .map((assignment) => assignment.servicio?.nombre)
                          .filter((name): name is string => Boolean(name))}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <ClientStatus status={client.estado} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client);
                          setSuccessMessage("");
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46] hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <MonthlyWorkspace allowClientCreation={false} />

      {isModalOpen && (
        <ClientCreateModal
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
          client={editingClient}
        />
      )}
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-3 font-semibold text-[#252f46]">{value}</dd>
    </div>
  );
}

function ClientStatus({ status }: { status: string }) {
  const normalizedStatus = status.trim().toLowerCase();
  const className =
    normalizedStatus === "activo"
      ? "border-green-200 bg-green-50 text-green-800"
      : normalizedStatus === "pendiente"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function ClientServices({ names }: { names: string[] }) {
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const previewLength = 20;

  if (names.length === 0) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Sin servicio
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => {
          const isLongName = name.length > previewLength;
          const label = isLongName ? `${name.slice(0, previewLength)}…` : name;

          return isLongName ? (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedServiceName(name)}
              className="inline-flex rounded-full border border-[#b98b7b] bg-[#faf5f3] px-2.5 py-1 text-left text-xs font-semibold text-[#735044] hover:bg-[#efe0da] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#735044]"
              aria-label={`Ver nombre completo del servicio: ${name}`}
            >
              {label}
            </button>
          ) : (
            <span
              key={name}
              className="inline-flex rounded-full border border-[#b98b7b] bg-[#faf5f3] px-2.5 py-1 text-xs font-semibold text-[#735044]"
            >
              {label}
            </span>
          );
        })}
      </div>

      {selectedServiceName && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nombre completo del servicio"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelectedServiceName(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#252f46]">Servicio asociado</h2>
            <p className="mt-3 break-words text-sm text-slate-700">{selectedServiceName}</p>
            <button
              type="button"
              onClick={() => setSelectedServiceName(null)}
              className="mt-5 rounded-lg bg-[#252f46] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344463]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
