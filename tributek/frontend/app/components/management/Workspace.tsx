"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useData, persist, syncRemoteClients } from "../ficha/store";
import { conceptLabel, concepts, receivables, services, today, type Concept } from "../ficha/model";
import { authenticatedFetch } from "../../features/auth/auth-client";
import ClientCreateModal, {
  type ClientRecord,
} from "../features/clientes/ClientCreateModal";
import ClientSheet, { PaymentForm, type ClientView } from "./ClientSheet";
import {
  receivedByCategory,
  balance,
  debt,
  extra,
  getMonth,
  periodLabel,
  totals,
  validateLedger,
  deferralBalance,
  removeDeferral,
  type Ledger,
  type Deferral,
  type Invoice,
} from "./model";
import {
  Badge,
  Empty,
  Field,
  Metric,
  Modal,
  Money,
  copyReportImage,
  downloadBlob,
} from "./ui";
import { PaymentFilesButton } from "./PaymentFiles";
import Formalization from "./Formalization";

export type View =
  | "inicio"
  | "clientes"
  | "obligaciones"
  | "facturacion"
  | "pagos"
  | "postergaciones"
  | "formalizaciones";
const names: Record<View, string> = {
  inicio: "Inicio",
  clientes: "Clientes",
  obligaciones: "Obligaciones",
  facturacion: "Facturación",
  pagos: "Pagos",
  postergaciones: "Postergaciones",
  formalizaciones: "Constitución de empresas",
};
export default function Workspace({ view }: { view: View }) {
  const store = useData();
  const data = store.data as Ledger;
  const meta = extra(data);
  const [remote, setRemote] = useState<ClientRecord[]>([]);
  const [load, setLoad] = useState("loading");
  const [reload, setReload] = useState(0);
  const [periodValue, setPeriod] = useState("");
  const period = periodValue || (store.ready ? today().slice(0, 7) : "2026-09");
  const [search, setSearch] = useState("");
  const [concept, setConcept] = useState("");
  const [status, setStatus] = useState("");
  const [machine, setMachine] = useState("");
  const [active, setActive] = useState("");
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<{
    client: ClientView;
    data: Ledger;
  } | null>(null);
  const [clientModal, setClientModal] = useState<ClientRecord | "new" | null>(
    null,
  );
  const [paymentClient, setPaymentClient] = useState("");
  const [editingPayment, setEditingPayment] = useState<string | undefined>();
  const [deferred, setDeferred] = useState<Deferral | null>(null);
  const [editDeferred, setEditDeferred] = useState<Deferral | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [processClient, setProcessClient] = useState<ClientView | null>(null);
  // Filas de /gestiones (cabecera + pasos) para la tabla de Formalizaciones.
  const [gestionesReload, setGestionesReload] = useState(0);
  const [gestiones, setGestiones] = useState<
    {
      id: string;
      clienteId: string;
      parentId: string | null;
      titulo: string;
      estado: string;
    }[]
  >([]);
  const [paymentFilter, setPaymentFilter] = useState("");
  const [allPayments, setAllPayments] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("cliente");
    if (id) queueMicrotask(() => setPaymentFilter(id));
  }, []);
  useEffect(() => {
    if (!store.ready || store.error) return;
    const controller = new AbortController();
    async function getClients() {
      try {
        const r = await authenticatedFetch("/clientes", {
          signal: controller.signal,
        });
        if (!r.ok) {
          const body = await r.json().catch(() => null) as { message?: string | string[] } | null;
          const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
          throw new Error(message || `No se pudo cargar el directorio (HTTP ${r.status}).`);
        }
        const rows: ClientRecord[] = await r.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(rows)) throw new Error("Directorio inválido.");
        const normalized = rows.map((c) => ({ ...c, id: String(c.id) }));
        setRemote(normalized);
        setLoad("ready");
        setError("");
        try {
          syncRemoteClients(normalized);
        } catch (syncError) {
          setError(syncError instanceof Error
            ? `Directorio cargado; no se pudieron sincronizar los datos locales: ${syncError.message}`
            : "Directorio cargado; no se pudieron sincronizar los datos locales.");
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setLoad("error");
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo conectar con el servidor.",
          );
        }
      }
    }
    void getClients();
    return () => controller.abort();
  }, [store.ready, store.error, reload]);
  // Tabla de Formalizaciones: filas (cabecera + pasos) desde el backend.
  // En fallo/401 la tabla queda vacía ("Sin iniciar") sin romper el resto de la vista.
  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(
      `/gestiones?tipo=${encodeURIComponent("Formalización")}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) return;
        const rows = (await r.json()) as {
          clienteId: unknown;
          parentId: unknown;
        }[];
        if (controller.signal.aborted || !Array.isArray(rows)) return;
        setGestiones(
          rows.map((g) => ({
            id: String((g as { id?: unknown }).id ?? ""),
            clienteId: String(g.clienteId),
            parentId:
              g.parentId === null || g.parentId === undefined
                ? null
                : String(g.parentId),
            titulo: String((g as { titulo?: unknown }).titulo ?? ""),
            estado: String((g as { estado?: unknown }).estado ?? ""),
          })),
        );
      })
      .catch(() => {
        /* sin conexión la tabla queda vacía; el modal muestra su propio error */
      });
    return () => controller.abort();
  }, [gestionesReload]);
  // El directorio de clientes tiene como fuente de verdad el backend. Los
  // datos locales guardan pagos y períodos; nunca deben inventar filas aquí.
  const clients: ClientView[] =
    view === "clientes" || view === "formalizaciones"
      ? remote.map((r) => {
          const local = data.clients.find((c) => c.id === r.id);
          const profile = meta.profiles[r.id];
          return {
            id: r.id,
            name: r.nombreRazonSocial,
            phone: r.telefono || "",
            note: local?.note || "",
            documentUrl: local?.documentUrl || "",
            rut: r.rut,
            machine: profile?.machine || "",
            fee: profile?.fee || 0,
            active: r.estado.toLowerCase() !== "inactivo",
          };
        })
      : data.clients.map((c) => {
          const r = remote.find((r) => r.id === c.id);
          const profile = meta.profiles[c.id];
          return {
            ...c,
            rut: r?.rut || profile?.rut || "",
            machine: profile?.machine || "",
            fee: profile?.fee || 0,
            active: r ? r.estado.toLowerCase() !== "inactivo" : (profile?.active ?? true),
          };
        });
  const visible = clients.filter(
    (c) =>
      `${c.name} ${c.rut}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (!machine || c.machine === machine) &&
      (!active || (active === "active") === c.active) &&
      (!status ||
        totals(data, getMonth(data, c.id, period)).status === status) &&
      (!concept ||
        (view === "clientes"
          ? debt(data, c.id, period, [concept as Concept])
          : balance(data, getMonth(data, c.id, period), concept as Concept)) >
          0),
  );
  const openDeferrals = meta.deferrals.filter(
    (d) => deferralBalance(data, d) > 0,
  );
  function save(next: Ledger, revision = data.revision) {
    persist(validateLedger(next), revision);
    setNotice("Cambios guardados.");
    setError("");
  }
  function run(action: () => void) {
    try {
      action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }
  async function removePayments(key: string) {
    if (
      !window.confirm(
        "¿Eliminar el movimiento completo (todos sus conceptos) y recalcular sus saldos?",
      )
    )
      return;
    try {
      const payment = data.payments.find(p => (p.transferId || p.id) === key);
      if (!payment) return;
      const response = await authenticatedFetch(`/payment-evidence/${payment.clientId}/${key}`, {method:"DELETE"});
      if (!response.ok) throw new Error("No se pudo archivar la carpeta de comprobantes. El pago no fue eliminado.");
      save({...data, payments:data.payments.filter(p => (p.transferId || p.id) !== key)});
    } catch(e) { setError((e as Error).message); }
  }
  const received = receivedByCategory(data, period);
  const pendingMonths = clients.filter(
    (c) =>
      data.months.some((m) => m.clientId === c.id && m.period === period) &&
      totals(data, getMonth(data, c.id, period)).status === "NO ENVIADO",
  );
  const payments = data.payments.filter(
    (p) =>
      (allPayments || p.date.slice(0, 7) === period) &&
      (!paymentFilter || p.clientId === paymentFilter) &&
      (!concept || p.concept === concept) &&
      `${clients.find((c) => c.id === p.clientId)?.name} ${clients.find((c) => c.id === p.clientId)?.rut} ${p.note}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const groups = Array.from(
    new Set(payments.map((p) => p.transferId || p.id)),
  ).map((key) => {
    const rows = payments.filter((p) => (p.transferId || p.id) === key);
    return {
      key,
      rows,
      first: rows[0],
      amount: rows.reduce((s, p) => s + p.amount, 0),
    };
  });
  const dueRows = clients.flatMap((c) =>
    ["Cotizaciones", "Impuestos"].flatMap((co) => {
      const value = balance(data, getMonth(data, c.id, period), co as Concept);
      return value > 0
        ? [
            {
              client: c,
              concept: co,
              amount: value,
              day: co === "Cotizaciones" ? 12 : 20,
            },
          ]
        : [];
    }),
  );
  function prepareInvoices() {
    run(() => {
      const existing = meta.invoices;
      const add = visible
        .filter(
          (c) =>
            c.active &&
            !existing.some(
              (i) =>
                i.clientId === c.id &&
                i.period === period &&
                i.kind === "monthly",
            ),
        )
        .map((c) => ({
          id: crypto.randomUUID(),
          clientId: c.id,
          period,
          kind: "monthly" as const,
          name: c.name,
          rut: c.rut,
          amount: data.months.some(
            (m) => m.clientId === c.id && m.period === period,
          )
            ? getMonth(data, c.id, period).amounts.Honorarios
            : c.fee,
          description: `Servicios mensuales ${periodLabel(period)}`,
          number: "",
          date: "",
          note: "",
        }));
      save({
        ...data,
        management: { ...meta, invoices: [...existing, ...add] },
      });
    });
  }
  if (!store.ready)
    return (
      <div className="tk">
        <Empty>Cargando gestión…</Empty>
      </div>
    );
  return (
    <div className="tk">
      <header className="tk-header">
        <div>
          <p className="tk-eyebrow">TRIBUTEK / Gestión</p>
          <h1>{names[view]}</h1>
        </div>
        <div className="tk-actions">
          <button onClick={() => setHidden(!hidden)}>
            {hidden ? "Mostrar montos" : "Ocultar montos"}
          </button>
          {view === "clientes" && (
            <button className="primary" onClick={() => setClientModal("new")}>
              Nuevo cliente
            </button>
          )}
          {view === "pagos" && (
            <button
              className="primary"
              disabled={!clients.length}
              onClick={() => {
                setEditingPayment(undefined);
                setPaymentClient(clients[0]?.id || "");
              }}
            >
              Registrar pago
            </button>
          )}
        </div>
      </header>
      {store.error && (
        <p role="alert" className="tk-error">
          {store.error}
        </p>
      )}
      {error && (
        <div role="alert" className="tk-error">
          {error}{" "}
          <button
            onClick={() => {
              setLoad("loading");
              setReload((n) => n + 1);
              setError("");
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="tk-success">
          {notice} <button onClick={() => setNotice("")}>Cerrar</button>
        </p>
      )}
      <div className="tk-toolbar">
        <Field
          label={view === "pagos" ? "Mes de recepción" : "Período de trabajo"}
        >
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={period}
            onChange={(e) => {
              if (e.target.value) {
                setPeriod(e.target.value);
                setSelected(null);
              }
            }}
          />
        </Field>
        {view !== "inicio" && (
          <label className="tk-field search">
            <span>Buscar cliente o RUT</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Razón social o RUT"
            />
          </label>
        )}
        {(view === "clientes" || view === "obligaciones") && (
          <>
            <Field label="Estado del mes">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {["NO ENVIADO", "ENVIADO", "PAGADO"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Concepto pendiente">
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              >
                <option value="">Todos</option>
                {(view === "clientes" ? receivables : concepts).map((c) => (
                  <option key={conceptLabel(c)} value={c}>{conceptLabel(c)}</option>
                ))}
              </select>
            </Field>
            <details className="tk-details">
              <summary>Más filtros</summary>
              <div className="tk-actions">
                <Field label="Máquina">
                  <select
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {Array.from(
                      new Set(clients.map((c) => c.machine).filter(Boolean)),
                    ).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Clientes">
                  <select
                    value={active}
                    onChange={(e) => setActive(e.target.value)}
                  >
                    <option value="">Activos e inactivos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </Field>
              </div>
            </details>
          </>
        )}
      </div>
      {load === "loading" && (
        <p role="status" className="tk-subtle">
          Actualizando clientes…
        </p>
      )}
      {view === "inicio" && (
        <>
          <div className="tk-metrics">
            <Metric label="Recibido por servicios">
              <Money value={received.services} hidden={hidden} />
            </Metric>
            <Metric label="Reembolsos recibidos">
              <Money value={received.reimbursements} hidden={hidden} />
            </Metric>
            <Metric label="Clientes con deuda de servicios">
              {clients.filter((c) => debt(data, c.id, period, services) > 0).length}
            </Metric>
            <Metric label="Postergaciones pendientes">
              <Money
                value={openDeferrals.reduce(
                  (s, d) => s + deferralBalance(data, d),
                  0,
                )}
                hidden={hidden}
              />
            </Metric>
            <Metric label="Obligaciones no enviadas">
              {pendingMonths.length}
            </Metric>
          </div>
          <section className="tk-card">
            <div className="tk-card-head">
              <h2>Control de vencimientos</h2>
              <Link className="tk-button" href="/admin/obligaciones">
                Ver obligaciones
              </Link>
            </div>
            <div className="tk-panel">
              <div className="tk-grid">
                {[
                  { c: "Cotizaciones", day: 12 },
                  { c: "Impuestos", day: 20 },
                ].map(({ c, day }) => (
                  <div className="tk-due" key={conceptLabel(c)}>
                    <span>
                      {conceptLabel(c)} · referencia interna día {day}
                    </span>
                    <strong>
                      {dueRows.filter((r) => r.concept === c).length} clientes
                    </strong>
                    <Money
                      value={dueRows
                        .filter((r) => r.concept === c)
                        .reduce((s, r) => s + r.amount, 0)}
                      hidden={hidden}
                    />
                  </div>
                ))}
              </div>
            </div>
            {dueRows.length ? (
              <div className="tk-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Concepto</th>
                      <th>Saldo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueRows.map((r) => (
                      <tr key={r.client.id + r.concept}>
                        <td>
                          <strong>{r.client.name}</strong>
                          <small>{r.client.rut}</small>
                        </td>
                        <td>{conceptLabel(r.concept)}</td>
                        <td>
                          <Money value={r.amount} hidden={hidden} />
                        </td>
                        <td>
                          <button
                            disabled={hidden}
                            onClick={() =>
                              setSelected({ client: r.client, data })
                            }
                          >
                            Ver ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                No hay impuestos ni cotizaciones previsionales pendientes en este período.
              </Empty>
            )}
          </section>
          <p className="tk-subtle">
            Ingresos: abonos de honorarios, formalización, cobranza y otro
            recibidos en {periodLabel(period)}. Las fechas de referencia no
            sustituyen el vencimiento confirmado del trámite.
          </p>
        </>
      )}
      {(view === "clientes" || view === "obligaciones") && (
        <>
          <div className="tk-metrics">
            <Metric label="Clientes visibles">{visible.length}</Metric>
            <Metric label="Con deuda de servicios">
              {visible.filter((c) => debt(data, c.id, period, services) > 0).length}
            </Metric>
            <Metric label="Deuda acumulada con TRIBUTEK">
              <Money
                value={visible.reduce(
                  (s, c) => s + debt(data, c.id, period),
                  0,
                )}
                hidden={hidden}
              />
            </Metric>
            <Metric label="Postergaciones pendientes">
              {
                openDeferrals.filter((d) =>
                  visible.some((c) => c.id === d.clientId),
                ).length
              }
            </Metric>
          </div>
          <section className="tk-card">
            <div className="tk-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    {view === "clientes" && <th>Creado en</th>}
                    <th>Máquina de pago</th>
                    <th>Estado del mes</th>
                    <th>
                      {view === "clientes"
                        ? "Deuda por concepto"
                        : "Obligación mensual"}
                    </th>
                    <th>
                      {view === "clientes"
                        ? "Suma filtrada"
                        : "Resumen del período"}
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const m = getMonth(data, c.id, period),
                      t = totals(data, m);
                    const creadoEn = remote.find((r) => r.id === c.id)?.creadoEn;
                    const cs = (
                      view === "clientes" ? receivables : concepts
                    ).filter((k) => !concept || k === concept);
                    return (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <small>
                            {c.rut} {!c.active && "· Inactivo"}
                          </small>
                          <a
                            href="https://www.sii.cl/"
                            target="_blank"
                            rel="noreferrer"
                            className="tk-subtle"
                          >
                            Ir al SII
                          </a>
                        </td>
                        {view === "clientes" && (
                          <td>
                            {creadoEn
                              ? new Intl.DateTimeFormat("es-CL", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }).format(new Date(creadoEn))
                              : "-"}
                          </td>
                        )}
                        <td>{c.machine || "—"}</td>
                        <td>
                          <Badge>
                            {data.months.includes(m)
                              ? t.status
                              : "SIN REGISTRO"}
                          </Badge>
                        </td>
                        <td>
                          {cs
                            .filter(
                              (k) =>
                                (view === "clientes"
                                  ? debt(data, c.id, period, [k])
                                  : balance(data, m, k)) > 0,
                            )
                            .map((k) => (
                              <div className="tk-detail" key={k}>
                                {conceptLabel(k)}:{" "}
                                <Money
                                  value={
                                    view === "clientes"
                                      ? debt(data, c.id, period, [k])
                                      : balance(data, m, k)
                                  }
                                  hidden={hidden}
                                />
                              </div>
                            ))}
                        </td>
                        <td>
                          {view === "clientes" ? (
                            <strong>
                              <Money
                                value={debt(data, c.id, period, cs)}
                                hidden={hidden}
                              />
                            </strong>
                          ) : (
                            <div>
                              <div className="tk-detail">
                                Total <Money value={t.total} hidden={hidden} />
                              </div>
                              <div className="tk-detail">
                                Cancelado{" "}
                                <Money value={t.received} hidden={hidden} />
                              </div>
                              <strong>
                                Pendiente{" "}
                                <Money value={t.pending} hidden={hidden} />
                              </strong>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="tk-actions">
                            <button
                              disabled={hidden}
                              onClick={() => setSelected({ client: c, data })}
                            >
                              Ver ficha
                            </button>
                            {view === "clientes" &&
                              remote.some((r) => r.id === c.id) && (
                                <button
                                  onClick={() =>
                                    setClientModal(
                                      remote.find((r) => r.id === c.id)!,
                                    )
                                  }
                                >
                                  Editar
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!visible.length && load === "ready" && (
              <Empty>
                {search || status || concept
                  ? "No hay clientes para estos filtros."
                  : "No hay clientes registrados."}
              </Empty>
            )}
          </section>
        </>
      )}
      {view === "facturacion" && (
        <>
          <div className="tk-actions" style={{ marginBottom: 20 }}>
            <button className="primary" onClick={prepareInvoices}>
              Preparar servicios mensuales
            </button>
            <button
              disabled={!visible.length}
              onClick={() => {
                const c = visible[0];
                setInvoice({
                  id: crypto.randomUUID(),
                  clientId: c.id,
                  name: c.name,
                  rut: c.rut,
                  period,
                  kind: "extra",
                  amount: 0,
                  description: "",
                  number: "",
                  date: "",
                  note: "",
                });
              }}
            >
              Agregar otro servicio
            </button>
          </div>
          {["monthly", "extra"].map((kind) => (
            <section className="tk-card" key={kind}>
              <div className="tk-card-head">
                <h2>
                  {kind === "monthly"
                    ? "Servicios mensuales"
                    : "Otros servicios"}
                </h2>
              </div>
              <div className="tk-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Nombre / RUT",
                        "Honorarios",
                        "Glosa",
                        "N° factura",
                        "Fecha",
                        "Observación",
                        "",
                      ].map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meta.invoices
                      .filter(
                        (i) =>
                          i.period === period &&
                          i.kind === kind &&
                          visible.some((c) => c.id === i.clientId),
                      )
                      .map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.name}</strong>
                            <small>{i.rut}</small>
                          </td>
                          <td>
                            <Money value={i.amount} hidden={hidden} />
                          </td>
                          <td>{i.description}</td>
                          <td>{i.number || "Sin facturar"}</td>
                          <td>{i.date || "—"}</td>
                          <td>{i.note || "—"}</td>
                          <td>
                            <button
                              disabled={hidden}
                              onClick={() => setInvoice(i)}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!meta.invoices.some(
                (i) => i.period === period && i.kind === kind,
              ) && (
                <Empty>
                  {kind === "monthly"
                    ? "Prepara el período para conservar los datos de los servicios mensuales."
                    : "Sin otros servicios en este período."}
                </Empty>
              )}
            </section>
          ))}
          <InvoiceComparison
            invoices={meta.invoices.filter((i) => i.period === period)}
            hidden={hidden}
          />
        </>
      )}
      {view === "pagos" && (
        <>
          <div className="tk-toolbar">
            <label className="tk-actions">
              <input
                type="checkbox"
                checked={allPayments}
                onChange={(e) => setAllPayments(e.target.checked)}
              />
              Todos los meses
            </label>
            <Field label="Cliente">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Concepto">
              <select
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              >
                <option value="">Todos</option>
                {concepts.map((c) => (
                  <option key={conceptLabel(c)} value={c}>{conceptLabel(c)}</option>
                ))}
              </select>
            </Field>
            <button
              disabled={!payments.length || hidden}
              onClick={async () => {
                try {
                  setNotice(
                    await copyReportImage(
                      "Historial de pagos",
                      allPayments ? "Todos los meses" : periodLabel(period),
                      payments.map((p) => ({
                        label: `${clients.find((c) => c.id === p.clientId)?.name || "Cliente"} · ${p.date} · ${conceptLabel(p.concept)}`,
                        amount: p.amount,
                      })),
                      payments.reduce((s, p) => s + p.amount, 0),
                    ),
                  );
                } catch {
                  setError("No se pudo copiar la imagen.");
                }
              }}
            >
              Copiar imagen
            </button>
          </div>
          <section className="tk-card">
            <div className="tk-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Aplicación</th>
                    <th>Monto</th>
                    <th>Glosa</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.key}>
                      <td>{g.first.date}</td>
                      <td>
                        {clients.find((c) => c.id === g.first.clientId)?.name}
                      </td>
                      <td>
                        {g.rows.map((p) => (
                          <div key={p.id} className="tk-detail">
                            {p.period} · {conceptLabel(p.concept)} ·{" "}
                            <Money value={p.amount} hidden={hidden} />
                          </div>
                        ))}
                      </td>
                      <td>
                        <Money value={g.amount} hidden={hidden} />
                        <small>
                          {g.first.destination === "institution"
                            ? "Pago a institución"
                            : "Recibido por TRIBUTEK"}
                        </small>
                      </td>
                      <td>{g.first.note}<small>{g.first.method}</small>{g.first.originAccount && <small>Origen: {hidden ? "••••" : g.first.originAccount}</small>}{g.first.receivingAccount && <small>Receptora: {hidden ? "••••" : g.first.receivingAccount}</small>}</td>
                      <td>
                        <div className="tk-actions">
                          <PaymentFilesButton clientId={g.first.clientId} id={g.key} date={g.first.date} amount={data.payments.filter(p => (p.transferId || p.id) === g.key).reduce((sum,p)=>sum+p.amount,0)} origin={g.first.originAccount} destination={g.first.receivingAccount} hidden={hidden} />
                          <button
                            disabled={hidden}
                            onClick={() => {
                              setEditingPayment(g.key);
                              setPaymentClient(g.first.clientId);
                            }}
                          >
                            Corregir
                          </button>
                          <button
                            className="danger"
                            onClick={() => removePayments(g.key)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!groups.length && (
              <Empty>
                No hay pagos para el mes y los filtros seleccionados.
              </Empty>
            )}
          </section>
        </>
      )}
      {view === "postergaciones" && (
        <>
          <div className="tk-actions" style={{ marginBottom: 20 }}>
            <Link className="tk-button primary" href="/admin/obligaciones">
              Postergar desde una obligación
            </Link>
          </div>
          <section className="tk-card">
            <div className="tk-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Origen</th>
                    <th>Monto</th>
                    <th>Vencimiento</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {meta.deferrals
                    .filter(
                      (d) =>
                        visible.some((c) => c.id === d.clientId) &&
                        d.period <= period,
                    )
                    .map((d) => {
                      const left = deferralBalance(data, d);
                      const now = today();
                      const near = new Date(`${now}T12:00:00`);
                      near.setDate(near.getDate() + 7);
                      const state =
                        left === 0
                          ? "PAGADO"
                          : d.due < now
                            ? "VENCIDA"
                            : new Date(`${d.due}T12:00:00`) <= near
                              ? "PRÓXIMA"
                              : "VIGENTE";
                      return (
                        <tr key={d.id}>
                          <td>
                            {clients.find((c) => c.id === d.clientId)?.name}
                          </td>
                          <td>
                            {conceptLabel(d.concept)}
                            <small>{periodLabel(d.period)}</small>
                          </td>
                          <td>
                            <Money value={d.amount} hidden={hidden} />
                          </td>
                          <td>{d.due}</td>
                          <td>
                            <Money value={left} hidden={hidden} />
                          </td>
                          <td>
                            <Badge>{state}</Badge>
                          </td>
                          <td>
                            <div className="tk-actions">
                              <button
                                disabled={!left}
                                onClick={() => setDeferred(d)}
                              >
                                Abonar
                              </button>
                              <button
                                disabled={hidden}
                                onClick={() => setEditDeferred(d)}
                              >
                                Editar
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "¿Eliminar la postergación y devolver el saldo a su período original?",
                                    )
                                  )
                                    run(() => save(removeDeferral(data, d.id)));
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {!meta.deferrals.length && (
              <Empty>No hay postergaciones registradas.</Empty>
            )}
          </section>
        </>
      )}
      {view === "formalizaciones" && (
        <section className="tk-card">
          <div className="tk-card-head">
            <h2>Creación de empresas</h2>
          </div>
          <div className="tk-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Progreso</th>
                  <th>Próximo paso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  // Fuente de verdad: cabecera (parentId null) + sus 11 pasos.
                  const cabecera = gestiones.find(
                    (g) => g.clienteId === c.id && !g.parentId,
                  );
                  const all = cabecera
                    ? gestiones
                        .filter((g) => g.parentId === cabecera.id)
                        .filter((s) => s.estado !== "No corresponde")
                    : [];
                  const done = all.filter(
                    (s) => s.estado === "Completado",
                  ).length;
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <small>{c.rut}</small>
                      </td>
                      <td>
                        {done}/{all.length || "—"}
                        <div className="tk-progress">
                          <span
                            style={{
                              width: `${all.length ? (done / all.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        {all.find((s) => s.estado !== "Completado")?.titulo ||
                          (!cabecera ? "Sin iniciar" : "Completado")}
                      </td>
                      <td>
                        <button onClick={() => setProcessClient(c)}>
                          {cabecera ? "Ver proceso" : "Iniciar proceso"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!visible.length && <Empty>No hay clientes para mostrar.</Empty>}
        </section>
      )}
      <details className="tk-privacy">
        <summary>Almacenamiento y respaldo</summary>
        <p>
          Clientes y documentos: servidor. Gestión mensual, pagos, facturación y
          procesos: este navegador.
        </p>
        <button
          onClick={() =>
            downloadBlob(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
              `tributek-respaldo-${today()}.json`,
            )
          }
        >
          Descargar respaldo local
        </button>
        <Field label="Restaurar respaldo JSON">
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const revision = data.revision;
              try {
                if (file.size > 10000000)
                  throw new Error("El respaldo supera 10 MB.");
                const restored = validateLedger(JSON.parse(await file.text()));
                if (
                  window.confirm(
                    "Se reemplazará la gestión local por este respaldo. Descarga primero tu copia actual. ¿Continuar?",
                  )
                )
                  save(restored, revision);
              } catch (error) {
                setError((error as Error).message);
              }
              e.target.value = "";
            }}
          />
        </Field>
      </details>
      {selected && (
        <ClientSheet
          client={selected.client}
          data={selected.data}
          period={period}
          accumulated={view === "clientes"}
          save={save}
          onClose={() => setSelected(null)}
          hidden={hidden}
        />
      )}
      {clientModal && (
        <ClientCreateModal
          client={clientModal === "new" ? undefined : clientModal}
          onClose={() => setClientModal(null)}
          onSaved={(client) => {
            setRemote((current) => [
              ...current.filter((item) => item.id !== client.id),
              client,
            ]);
            setLoad("ready");
            setReload((n) => n + 1);
            setNotice("Cliente guardado en el servidor. Comparte la invitación desde el formulario si se habilitó el portal.");
          }}
        />
      )}
      {paymentClient && (
        <Modal
          title={editingPayment ? "Corregir pago" : "Registrar pago"}
          onClose={() => setPaymentClient("")}
        >
          <div className="tk-dialog-body">
            {!editingPayment && (
              <Field label="Cliente">
                <select
                  value={paymentClient}
                  onChange={(e) => setPaymentClient(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <PaymentForm
              key={paymentClient + (editingPayment || "")}
              data={data}
              clientId={paymentClient}
              period={period}
              save={save}
              onClose={() => setPaymentClient("")}
              editingKey={editingPayment}
            />
          </div>
        </Modal>
      )}
      {deferred && (
        <Modal title="Abonar postergación" onClose={() => setDeferred(null)}>
          <div className="tk-dialog-body">
            <PaymentForm
              data={data}
              clientId={deferred.clientId}
              period={period}
              deferredId={deferred.id}
              save={save}
              onClose={() => setDeferred(null)}
            />
          </div>
        </Modal>
      )}
      {editDeferred && (
        <Modal
          title="Editar postergación"
          onClose={() => setEditDeferred(null)}
        >
          <form
            className="tk-dialog-body tk-stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => {
                save({
                  ...data,
                  management: {
                    ...meta,
                    deferrals: meta.deferrals.map((d) =>
                      d.id === editDeferred.id ? editDeferred : d,
                    ),
                  },
                });
                setEditDeferred(null);
              });
            }}
          >
            {error && (
              <p role="alert" className="tk-error">
                {error}
              </p>
            )}
            <Field label="Monto">
              <input
                type="number"
                min="1"
                step="1"
                value={editDeferred.amount}
                onChange={(e) =>
                  setEditDeferred({
                    ...editDeferred,
                    amount: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Vencimiento confirmado">
              <input
                type="date"
                required
                value={editDeferred.due}
                onChange={(e) =>
                  setEditDeferred({ ...editDeferred, due: e.target.value })
                }
              />
            </Field>
            <Field label="Observación">
              <textarea
                value={editDeferred.note}
                maxLength={500}
                onChange={(e) =>
                  setEditDeferred({ ...editDeferred, note: e.target.value })
                }
              />
            </Field>
            <button className="primary">Guardar cambios</button>
          </form>
        </Modal>
      )}
      {invoice && (
        <InvoiceEditor
          initial={invoice}
          clients={clients}
          onClose={() => setInvoice(null)}
          onSave={(i) => {
            save({
              ...data,
              management: {
                ...meta,
                invoices: meta.invoices.some((x) => x.id === i.id)
                  ? meta.invoices.map((x) => (x.id === i.id ? i : x))
                  : [...meta.invoices, i],
              },
            });
            setInvoice(null);
          }}
        />
      )}
      {processClient && (
        <Formalization
          client={processClient}
          period={period}
          onSaved={() => setGestionesReload((r) => r + 1)}
          onClose={() => setProcessClient(null)}
        />
      )}
    </div>
  );
}
function InvoiceEditor({
  initial,
  clients,
  onSave,
  onClose,
}: {
  initial: Invoice;
  clients: ClientView[];
  onSave: (i: Invoice) => void;
  onClose: () => void;
}) {
  const [i, setI] = useState(initial);
  const [error, setError] = useState("");
  return (
    <Modal
      title={i.kind === "monthly" ? "Servicio mensual" : "Otro servicio"}
      onClose={onClose}
    >
      <form
        className="tk-dialog-body tk-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(i);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {error && (
          <p role="alert" className="tk-error">
            {error}
          </p>
        )}
        {i.kind === "extra" ? (
          <Field label="Cliente">
            <select
              value={i.clientId}
              onChange={(e) => {
                const c = clients.find((c) => c.id === e.target.value)!;
                setI({ ...i, clientId: c.id, name: c.name, rut: c.rut });
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p>
            {i.name} · {i.rut}
          </p>
        )}
        <Field label="Honorarios">
          <input
            type="number"
            min="0"
            step="1"
            value={i.amount}
            readOnly={i.kind === "monthly"}
            onChange={(e) => setI({ ...i, amount: Number(e.target.value) })}
          />
        </Field>
        <Field label="Glosa">
          <input
            required
            maxLength={300}
            value={i.description}
            readOnly={i.kind === "monthly"}
            onChange={(e) => setI({ ...i, description: e.target.value })}
          />
        </Field>
        <div className="tk-grid">
          <Field label="N° factura">
            <input
              value={i.number}
              maxLength={50}
              onChange={(e) => setI({ ...i, number: e.target.value })}
            />
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              value={i.date}
              onChange={(e) => setI({ ...i, date: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Observación">
          <textarea
            maxLength={1000}
            value={i.note}
            onChange={(e) => setI({ ...i, note: e.target.value })}
          />
        </Field>
        <footer>
          <button className="primary">Guardar</button>
        </footer>
      </form>
    </Modal>
  );
}
function InvoiceComparison({
  invoices,
  hidden,
}: {
  invoices: Invoice[];
  hidden: boolean;
}) {
  const [reference, setReference] = useState("");
  const total = invoices
    .filter((i) => i.number && i.date)
    .reduce((s, i) => s + i.amount, 0);
  return (
    <section className="tk-card tk-panel">
      <h2>Comparación con SII</h2>
      <div className="tk-grid">
        <div className="tk-line">
          <span>Total con factura registrada</span>
          <Money value={total} hidden={hidden} />
        </div>
        <Field label="Total informado por SII">
          <input
            type="number"
            min="0"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      {reference !== "" && (
        <p className="tk-subtle">
          Diferencia:{" "}
          <Money value={total - Number(reference)} hidden={hidden} />
        </p>
      )}
    </section>
  );
}
