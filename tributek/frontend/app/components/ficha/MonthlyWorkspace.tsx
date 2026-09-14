"use client";
import { useState, useEffect, type FormEvent } from "react";
import Icon from "../ui/Icon";
import { authenticatedFetch } from "../../features/auth/auth-client";
import { useData, persist } from "./store";
import {
  concepts,
  newMonth,
  summary,
  serviceDebt,
  paid,
  saveMonth,
  addPayment,
  message,
  money,
  today,
  validPeriod,
  validateClient,
  type Client,
  type Month,
  type Data,
  type Concept,
} from "./model";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-[#735044]";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#252f46] px-4 py-2 text-sm font-semibold text-white hover:bg-[#344463] disabled:opacity-40";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40";
const box = "rounded-xl border border-slate-200 bg-white p-5";

type RegisteredClient = {
  id: string | number;
  nombreRazonSocial: string;
  rut: string;
  contactoPrincipal?: string | null;
  emailContacto?: string | null;
  estado?: string | null;
};

export default function MonthlyWorkspace({
  dashboard = false,
  allowClientCreation = true,
}: {
  dashboard?: boolean;
  allowClientCreation?: boolean;
}) {
  const store = useData();
  const [periodChoice, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientRevision, setClientRevision] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accumulated, setAccumulated] = useState(false);
  const [copied, setCopied] = useState("");
  const [monthDirty, setMonthDirty] = useState(false);
  const [registeredClients, setRegisteredClients] = useState<RegisteredClient[]>([]);
  const [registeredClientsLoading, setRegisteredClientsLoading] = useState(false);
  const [registeredClientsError, setRegisteredClientsError] = useState("");
  const date = store.ready ? today() : "";
  const period = periodChoice || date.slice(0, 7);
  const usable = store.ready && !store.error && validPeriod(period);
  const client = store.data.clients.find((c) => c.id === selected);
  const month = store.data.months.find(
    (m) => m.clientId === selected && m.period === period,
  );
  const rows = store.data.clients.map((c) => {
    const m =
      store.data.months.find(
        (m) => m.clientId === c.id && m.period === period,
      ) ?? newMonth(c.id, period);
    return { client: c, month: m, ...summary(store.data, m) };
  });
  const filtered = rows.filter(
    (r) =>
      r.client.name
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (!state || r.status === state),
  );
  useEffect(() => {
    if (!dashboard) return;

    const textoBusqueda = search.trim();
    if (!textoBusqueda) {
      setRegisteredClients([]);
      setRegisteredClientsError("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRegisteredClientsLoading(true);
      setRegisteredClientsError("");

      try {
        const response = await authenticatedFetch(
          `/clientes?buscar=${encodeURIComponent(textoBusqueda)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("No se pudieron buscar los clientes registrados.");
        }

        setRegisteredClients(await response.json());
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setRegisteredClientsError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudieron buscar los clientes registrados.",
          );
          setRegisteredClients([]);
        }
      } finally {
        if (!controller.signal.aborted) setRegisteredClientsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [dashboard, search]);
  const totals = rows.reduce(
    (s, r) => ({
      total: s.total + r.total,
      received: s.received + r.received,
      balance: s.balance + r.balance,
    }),
    { total: 0, received: 0, balance: 0 },
  );
  const due = store.data.months
    .filter((m) => m.followDate && !m.followDone)
    .sort((a, b) => a.followDate.localeCompare(b.followDate));
  const currentMessage = client
    ? message(store.data, client.id, period, accumulated)
    : "";
  function write(next: Data, revision: string) {
    persist(next, revision);
    setNotice("Cambios guardados en este navegador.");
    setError("");
  }
  function beginClient(value?: Client) {
    setClientRevision(store.data.revision);
    setEditingClient(
      value
        ? { ...value }
        : {
            id: crypto.randomUUID(),
            name: "",
            phone: "",
            note: "",
            documentUrl: "",
          },
    );
    setError("");
  }
  function submitClient(event: FormEvent) {
    event.preventDefault();
    if (!editingClient) return;
    try {
      validateClient(editingClient);
      if (
        store.data.clients.some(
          (c) =>
            c.id !== editingClient.id &&
            c.name.trim().toLocaleLowerCase("es") ===
              editingClient.name.trim().toLocaleLowerCase("es"),
        )
      )
        throw new Error("Ya hay un cliente de ensayo con ese nombre.");
      const exists = store.data.clients.some((c) => c.id === editingClient.id);
      if (!exists && store.data.clients.length >= 100)
        throw new Error("Límite de 100 clientes de ensayo.");
      const saved = { ...editingClient, name: editingClient.name.trim() };
      write(
        {
          ...store.data,
          clients: exists
            ? store.data.clients.map((c) => (c.id === saved.id ? saved : c))
            : [...store.data.clients, saved],
        },
        clientRevision,
      );
      setSelected(saved.id);
      setEditingClient(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cliente.",
      );
    }
  }
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied("Detalle copiado. El envío sigue siendo manual.");
    } catch {
      setCopied(
        "No se pudo copiar automáticamente. Selecciona el texto y usa Ctrl+C.",
      );
    }
  }
  return (
    <div className="space-y-6 pt-6 text-[#252f46]">
      <aside className="rounded-xl border border-[#b98b7b] bg-[#faf5f3] p-4 text-sm leading-6">
        <strong>Ensayo funcional local.</strong> Usa información ficticia
        mientras se extraen datos reales.        
      </aside>
      {!store.ready && <p role="status">Cargando fichas…</p>}
      {(store.error || error) && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {store.error || error}
        </p>
      )}
      <p role="status" className="text-sm text-emerald-800">
        {notice}
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold">
          Mes y año
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setSelected("");
              setCopied("");
            }}
            disabled={!!selected || !!editingClient}
            className={field}
          />
        </label>
        <label className="min-w-48 flex-1 text-sm font-semibold">
          Buscar razón social
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={field}
          />
        </label>
        <label className="text-sm font-semibold">
          Estado de cobranza
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={field}
          >
            <option value="">Todos</option>
            {["NO ENVIADO", "ENVIADO", "PAGADO"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {allowClientCreation && (
        <button
          type="button"
          disabled={!usable || !!selected || !!editingClient}
          className={button}
          onClick={() => beginClient()}
        >
          <Icon name="plus" />
          Nuevo cliente de ensayo
        </button>
       )}
      </div>
      {dashboard && search.trim() && (
        <section className={`${box} space-y-4`} aria-label="Clientes registrados">
          <div>
            <h2 className="text-xl font-bold">Clientes registrados</h2>
            <p className="text-sm text-slate-600">
              Resultados de la búsqueda en TRIBUTEK.
            </p>
          </div>
          {registeredClientsLoading && (
            <p role="status" className="text-sm text-slate-600">
              Buscando clientes...
            </p>
          )}
          {registeredClientsError && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
              {registeredClientsError}
            </p>
          )}
          {!registeredClientsLoading && !registeredClientsError && (
            registeredClients.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead>
                    <tr>
                      {["Cliente / razón social", "RUT", "Contacto", "Estado"].map(
                        (column) => (
                          <th key={column} className="border-b p-3 font-semibold">
                            {column}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {registeredClients.map((registeredClient) => (
                      <tr key={registeredClient.id}>
                        <td className="border-b p-3 font-semibold">
                          {registeredClient.nombreRazonSocial}
                        </td>
                        <td className="border-b p-3">{registeredClient.rut}</td>
                        <td className="border-b p-3">
                          {registeredClient.contactoPrincipal ||
                            registeredClient.emailContacto ||
                            "-"}
                        </td>
                        <td className="border-b p-3">
                          {registeredClient.estado || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No hay clientes registrados que coincidan con la búsqueda.</p>
            )
          )}
        </section>
      )}
      {usable && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Conceptos del mes", money(totals.total)],
              ["Abonos aplicados al mes", money(totals.received)],
              ["Saldo del mes", money(totals.balance)],
              [
                "Clientes con deuda de servicios",
                String(
                  rows.filter(
                    (r) => serviceDebt(store.data, r.client.id, period) > 0,
                  ).length,
                ),
              ],
            ].map(([label, value]) => (
              <div key={label} className={box}>
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-2 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-600">
            Conceptos del mes no equivale a facturas emitidas. Abonos aplicados
            al mes se agrupan por período de la deuda, no por fecha de
            transferencia.
          </p>
          {editingClient && (
            <form
              onSubmit={submitClient}
              className={`${box} space-y-4`}
              aria-label="Datos del cliente de ensayo"
            >
              <h2 className="text-xl font-bold">Datos del cliente de ensayo</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  Razón social ficticia
                  <input
                    required
                    maxLength={180}
                    value={editingClient.name}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        name: e.target.value,
                      })
                    }
                    className={field}
                  />
                </label>
                <label>
                  Teléfono de ensayo (opcional)
                  <input
                    maxLength={30}
                    value={editingClient.phone}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        phone: e.target.value,
                      })
                    }
                    className={field}
                  />
                </label>
                <label className="md:col-span-2">
                  Enlace documental público de ensayo (opcional)
                  <input
                    type="url"
                    maxLength={500}
                    placeholder="https://…"
                    value={editingClient.documentUrl}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        documentUrl: e.target.value,
                      })
                    }
                    className={field}
                  />
                </label>
                <label className="md:col-span-2">
                  Nota interna de ensayo
                  <textarea
                    maxLength={1000}
                    value={editingClient.note}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        note: e.target.value,
                      })
                    }
                    className={field}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button className={button}>Guardar cliente</button>
                <button
                  type="button"
                  className={secondary}
                  onClick={() => setEditingClient(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {!client && !editingClient && (
            <section
              className={`${box} overflow-x-auto`}
              aria-label="Clientes del período"
            >
              <h2 className="mb-4 text-xl font-bold">Clientes del período</h2>
              {!filtered.length ? (
                <p>
                  No hay clientes que coincidan. Crea un cliente de ensayo para
                  comenzar.
                </p>
              ) : (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        "Cliente",
                        "Trabajo del mes",
                        "Cobranza",
                        "Saldo del mes",
                        "Deuda servicios hasta el mes",
                        "Ficha",
                      ].map((h) => (
                        <th key={h} className="border-b p-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.client.id}>
                        <td className="border-b p-3 font-semibold">
                          {r.client.name}
                        </td>
                        <td className="border-b p-3">
                          {r.month.steps.filter((s) => s.done).length}/
                          {r.month.steps.length}
                        </td>
                        <td className="border-b p-3">{r.status}</td>
                        <td className="border-b p-3">{money(r.balance)}</td>
                        <td className="border-b p-3">
                          {money(serviceDebt(store.data, r.client.id, period))}
                        </td>
                        <td className="border-b p-3">
                          <button
                            type="button"
                            className={secondary}
                            onClick={() => {
                              setSelected(r.client.id);
                              setCopied("");
                            }}
                          >
                            Ver ficha
                            <span className="sr-only"> de {r.client.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
          {client && !editingClient && (
            <section className="space-y-5" aria-label="Ficha mensual">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{client.name}</h2>
                  <p className="text-sm text-slate-600">Ficha de {period}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={monthDirty}
                    className={secondary}
                    onClick={() => beginClient(client)}
                  >
                    Editar cliente
                  </button>
                  <button
                    type="button"
                    disabled={monthDirty}
                    className={secondary}
                    onClick={() => {
                      setSelected("");
                      setError("");
                    }}
                  >
                    Cerrar ficha
                  </button>
                </div>
              </div>
              {client.note && (
                <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-4 text-sm">
                  <strong>Nota interna de ensayo: </strong>
                  {client.note}
                </p>
              )}
              {client.documentUrl && (
                <a
                  href={client.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block underline"
                >
                  Abrir enlace documental de ensayo
                </a>
              )}
              <MonthEditor
                key={`${client.id}/${period}`}
                data={store.data}
                initial={month ?? newMonth(client.id, period)}
                onSave={write}
                onDirty={setMonthDirty}
              />
              {month && (
                <>
                  <PaymentForm
                    key={`${client.id}/${period}/payment`}
                    data={store.data}
                    month={month}
                    onSave={write}
                  />
                  <section className={`${box} space-y-3`}>
                    <h3 className="text-xl font-bold">
                      Detalle para el cliente
                    </h3>
                    <label className="block">
                      Tipo de detalle
                      <select
                        value={accumulated ? "accumulated" : "month"}
                        onChange={(e) => {
                          setAccumulated(e.target.value === "accumulated");
                          setCopied("");
                        }}
                        className={field}
                      >
                        <option value="month">
                          Pendientes de la obligación mensual
                        </option>
                        <option value="accumulated">
                          Cobros pendientes acumulados por servicios
                        </option>
                      </select>
                    </label>
                    <p className="text-sm text-slate-600">
                      Usa únicamente conceptos y abonos guardados. Excluye notas
                      internas, checklist y seguimientos. Revisa el texto antes
                      de enviarlo.
                    </p>
                    <textarea
                      aria-label="Mensaje de cobranza"
                      readOnly
                      rows={12}
                      value={currentMessage}
                      className={field}
                    />
                    <button
                      type="button"
                      className={button}
                      onClick={() => void copyMessage()}
                    >
                      Copiar detalle
                    </button>
                    <p role="status">{copied}</p>
                  </section>
                  <section className={box}>
                    <h3 className="mb-3 text-xl font-bold">
                      Historial de períodos
                    </h3>
                    <ul className="space-y-2">
                      {store.data.months
                        .filter((m) => m.clientId === client.id)
                        .sort((a, b) => a.period.localeCompare(b.period))
                        .map((m) => (
                          <li
                            key={m.period}
                            className="flex flex-wrap justify-between gap-2 border-b py-2"
                          >
                            <span>
                              {m.period} · {summary(store.data, m).status}
                            </span>
                            <span>
                              Saldo mensual{" "}
                              {money(summary(store.data, m).balance)}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-slate-600">
                      Para trabajar en otro período, cierra la ficha y cambia el
                      selector. Los meses anteriores se conservan.
                    </p>
                  </section>
                </>
              )}
            </section>
          )}
          {(dashboard || !client) && (
            <section className={box}>
              <h2 className="text-xl font-bold">Próximos seguimientos</h2>
              <p className="my-2 text-sm">
                Vencidos o para hoy:{" "}
                {due.filter((m) => m.followDate <= date).length}. Incluye todos
                los períodos.
              </p>
              {!due.length ? (
                <p className="text-slate-600">
                  No hay contactos pendientes programados.
                </p>
              ) : (
                <ul className="divide-y">
                  {due.slice(0, 10).map((m) => (
                    <li key={`${m.clientId}/${m.period}`} className="py-3">
                      <strong>
                        {
                          store.data.clients.find((c) => c.id === m.clientId)
                            ?.name
                        }
                      </strong>
                      <p>
                        {m.followDate} · {m.period}
                        {m.followDate <= date
                          ? " · Contactar hoy o vencido"
                          : ""}
                      </p>
                      <p className="text-sm text-slate-600">{m.followNote}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MonthEditor({
  data,
  initial,
  onSave,
  onDirty,
}: {
  data: Data;
  initial: Month;
  onSave: (data: Data, revision: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Month>(() => structuredClone(initial));
  const [revision, setRevision] = useState(data.revision);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const update = (patch: Partial<Month>) => {
    setDraft({ ...draft, ...patch });
    setSaved("");
  };
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial) || !!step.trim();
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (step.trim())
        throw new Error(
          "Agrega el paso escrito o vacía ese campo antes de guardar.",
        );
      onSave(saveMonth(data, draft), dirty ? revision : data.revision);
      setRevision(data.revision);
      setSaved("Ficha mensual guardada.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }
  // Una revisión cambia tras guardar o registrar un abono. Solo se adopta al editar desde una ficha limpia.
  function touch() {
    if (!dirty) setRevision(data.revision);
  }
  return (
    <form
      onSubmit={submit}
      onChangeCapture={touch}
      className={`${box} space-y-5`}
      aria-label="Editar ficha mensual"
    >
      <h3 className="text-xl font-bold">Conceptos del mes</h3>
      <p className="text-sm text-slate-600">
        Montos manuales en pesos, sin cálculo tributario. Cero significa que no
        hay monto registrado para ese concepto.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {concepts.map((c) => (
          <label key={c} className="text-sm font-semibold">
            {c}
            <input
              type="number"
              min={0}
              max={999999999}
              step={1}
              inputMode="numeric"
              placeholder="0"
              className={field}
              value={draft.amounts[c] === 0 ? "" : draft.amounts[c]}
              onChange={(e) =>
                update({
                  amounts: {
                    ...draft.amounts,
                    [c]: e.target.value === "" ? 0 : Number(e.target.value),
                  },
                })
              }
            />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={draft.sent}
          onChange={(e) => update({ sent: e.target.checked })}
          className="h-5 w-5"
        />
        Ya informé al cliente de este detalle mensual
      </label>
      <p className="text-xs text-slate-600">
        Copiar el mensaje no marca el envío. PAGADO aparece cuando todos los
        conceptos del mes tienen saldo cero y existe un total mayor que cero.
      </p>
      <fieldset className="space-y-3 border-t pt-4">
        <legend className="font-bold">
          Trabajo del mes · {draft.steps.filter((s) => s.done).length}/
          {draft.steps.length}
        </legend>
        {draft.steps.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={s.done}
                onChange={(e) =>
                  update({
                    steps: draft.steps.map((row) =>
                      row.id === s.id
                        ? { ...row, done: e.target.checked }
                        : row,
                    ),
                  })
                }
              />
              {s.text}
            </label>
            <button
              type="button"
              className={secondary}
              aria-label={`Quitar ${s.text}`}
              onClick={() => {
                touch();
                update({ steps: draft.steps.filter((row) => row.id !== s.id) });
              }}
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1">
            Nuevo paso
            <input
              maxLength={180}
              value={step}
              onChange={(e) => setStep(e.target.value)}
              className={field}
            />
          </label>
          <button
            type="button"
            className={secondary}
            disabled={!step.trim() || draft.steps.length >= 20}
            onClick={() => {
              touch();
              update({
                steps: [
                  ...draft.steps,
                  { id: crypto.randomUUID(), text: step.trim(), done: false },
                ],
              });
              setStep("");
            }}
          >
            Agregar paso
          </button>
        </div>
      </fieldset>
      <fieldset className="grid gap-3 border-t pt-4 md:grid-cols-2">
        <legend className="font-bold">Próximo contacto del período</legend>
        <label>
          Fecha de contacto
          <input
            type="date"
            value={draft.followDate}
            onChange={(e) =>
              update({ followDate: e.target.value, followDone: false })
            }
            className={field}
          />
        </label>
        <label>
          Motivo de ensayo
          <input
            maxLength={500}
            value={draft.followNote}
            onChange={(e) => update({ followNote: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={draft.followDone}
            onChange={(e) => update({ followDone: e.target.checked })}
          />
          Contacto realizado
        </label>
        <p className="text-xs text-slate-600">
          Una fecha por cliente y período.
        </p>
      </fieldset>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p role="status" className="text-emerald-800">
        {saved}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={button}>Guardar ficha mensual</button>
        <button
          type="button"
          className={secondary}
          onClick={() => {
            setDraft(structuredClone(initial));
            setRevision(data.revision);
            setStep("");
            setError("");
            setSaved("Se descartaron los cambios sin guardar.");
          }}
        >
          Descartar cambios
        </button>
        <span className="self-center text-sm">
          {dirty ? "Hay cambios sin guardar" : "Sin cambios pendientes"}
        </span>
      </div>
    </form>
  );
}

function PaymentForm({
  data,
  month,
  onSave,
}: {
  data: Data;
  month: Month;
  onSave: (data: Data, revision: string) => void;
}) {
  const [concept, setConcept] = useState<Concept>("Honorarios");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const totals = summary(data, month);
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      onSave(
        addPayment(data, {
          id: crypto.randomUUID(),
          clientId: month.clientId,
          period: month.period,
          concept,
          amount: Number(amount),
          date,
          note: note.trim(),
          createdAt: new Date().toISOString(),
        }),
        data.revision,
      );
      setAmount("");
      setNote("");
      setError("");
      setNotice("Abono aplicado al concepto y período seleccionados.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar.");
    }
  }
  return (
    <section className={`${box} space-y-4`}>
      <h3 className="text-xl font-bold">Abonos del período</h3>
      <p>
        Total {money(totals.total)} · Abonado {money(totals.received)} ·
        Pendiente {money(totals.balance)} · <strong>{totals.status}</strong>
      </p>
      <p className="text-sm text-slate-600">
        Elige qué concepto paga este importe. Si una transferencia cubre varios
        conceptos, registra cada parte una sola vez, usando la misma fecha y una
        glosa que la identifique. No hay distribución automática ni anulación de
        abonos en este ensayo.
      </p>
      <form
        onSubmit={submit}
        className="grid gap-3 md:grid-cols-2"
        aria-label="Registrar abono"
      >
        <label>
          Concepto del abono
          <select
            value={concept}
            onChange={(e) => setConcept(e.target.value as Concept)}
            className={field}
          >
            {concepts.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Monto del abono
          <input
            type="number"
            required
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={field}
          />
        </label>
        <label>
          Fecha de transferencia
          <input
            type="date"
            required
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </label>
        <label>
          Glosa del abono
          <input
            required
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={field}
          />
        </label>
        <p className="text-sm">
          Disponible en {concept}:{" "}
          {money(
            month.amounts[concept] -
              paid(data, month.clientId, month.period, concept),
          )}
        </p>
        <button className={button}>Registrar abono</button>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p role="status" className="text-emerald-800">
        {notice}
      </p>
      <ul className="divide-y">
        {data.payments
          .filter(
            (p) => p.clientId === month.clientId && p.period === month.period,
          )
          .map((p) => (
            <li key={p.id} className="py-3 text-sm">
              <strong>
                {p.date} · {p.concept} · {money(p.amount)}
              </strong>
              <p>{p.note}</p>
            </li>
          ))}
      </ul>
    </section>
  );
}
