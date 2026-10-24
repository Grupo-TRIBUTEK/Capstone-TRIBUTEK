"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useData, persist } from "../ficha/store";
import { sincronizarMes, sincronizarPostergaciones } from "./syncObligaciones";
import { mesIgual } from "./syncHelpers";
import { conceptLabel, concepts, receivables, services, today, validPeriod, type Concept } from "../ficha/model";
import { authenticatedFetch } from "../../features/auth/auth-client";
import ClientCreateModal, {
  type ClientRecord,
} from "../features/clientes/ClientCreateModal";
import ClientSheet, { PaymentForm, type ClientView } from "./ClientSheet";
import Formalization from "./Formalization";
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
  StatusMessage,
  downloadBlob,
} from "./ui";
import Icon from "../ui/Icon";

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

const viewDescriptions: Record<View, string> = {
  inicio: "Revisa el estado de tu gestión y las tareas pendientes.",
  clientes: "Administra la cartera de clientes, sus datos y su estado.",
  obligaciones: "Gestiona las obligaciones mensuales por cliente y su seguimiento.",
  facturacion: "Prepara y administra las facturas de servicios mensuales y adicionales.",
  pagos: "Registra, revisa y gestiona los pagos recibidos.",
  postergaciones: "Controla las postergaciones vigentes, sus saldos y vencimientos.",
  formalizaciones: "Da seguimiento al proceso de constitución de empresas por cliente.",
};

function InvoiceComparison({ invoices, hidden }: { invoices: Invoice[]; hidden: boolean }) {
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
            className="tk-sii-reference"
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

// Shape de respuesta del backend GET /obligaciones
type ObligacionesResponse = {
  clients: Array<{
    id: string;
    tipoCliente: string;
    rut: string;
    nombreRazonSocial: string;
    contactoPrincipal: string;
    emailContacto: string;
    telefono: string;
    direccion: string;
    estado: string;
    creadoEn: string;
    actualizadoEn: string;
  }>;
  months: Array<{
    clientId: string;
    period: string;
    amounts: Record<string, number>;
    sent: boolean;
    steps: { id: string; text: string; done: boolean }[];
    followDate: string;
    followNote: string;
    followDone: boolean;
  }>;
  payments: Array<{
    id: string;
    clientId: string;
    period: string;
    concept: string;
    amount: number;
    date: string;
    note: string;
    createdAt: string;
    transferId: string | null;
    method: string | null;
    originAccount: string | null;
    receivingAccount: string | null;
    destination: string | null;
    deferredId: string | null;
  }>;
  deferrals: Array<{
    id: string;
    clientId: string;
    period: string;
    concept: string;
    amount: number;
    due: string;
    note: string;
  }>;
  invoices: Array<{
    id: string;
    clienteId: string;
    anio: number;
    mes: number;
    tipo: string;
    nombre: string;
    rut: string;
    descripcion: string;
    monto: number;
    numero: string;
    fecha: string;
    nota: string;
    creadoEn: string;
  }>;
};

// Convierte la respuesta del backend al Ledger que consumen las vistas.
function serverToLedger(s: ObligacionesResponse, base: Ledger): Ledger {
  return {
    version: base.version,
    clients: s.clients.map((c) => ({
      id: c.id,
      name: c.nombreRazonSocial,
      phone: c.telefono || "",
      note: "",
      documentUrl: "",
    })),
    months: s.months,
    payments: s.payments.map((p) => ({
      ...p,
      concept: p.concept as Concept,
      transferId: p.transferId ?? undefined,
      method: p.method ?? undefined,
      originAccount: p.originAccount ?? undefined,
      receivingAccount: p.receivingAccount ?? undefined,
      deferredId: p.deferredId ?? undefined,
      destination: p.destination === "institution"
        ? ("institution" as const)
        : p.destination === "tributek"
          ? ("tributek" as const)
          : undefined,
    })),
    management: {
      profiles: {},
      processes: [],
      deferrals: s.deferrals.map((d) => ({ ...d, concept: d.concept as Concept })),
      invoices: s.invoices.map((inv) => ({
        id: inv.id,
        clientId: inv.clienteId,
        period: `${inv.anio}-${String(inv.mes).padStart(2, "0")}`,
        kind: inv.tipo === "monthly" ? ("monthly" as const) : ("extra" as const),
        name: inv.nombre,
        rut: inv.rut,
        amount: inv.monto,
        description: inv.descripcion,
        number: inv.numero,
        date: inv.fecha,
        note: inv.nota,
      })),
    },
    revision: base.revision,
  };
}

export default function Workspace({ view }: { view: View }) {
  const store = useData();
  const localData = store.data as Ledger;
  const [serverData, setServerData] = useState<ObligacionesResponse | null>(null);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
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
  const [selected, setSelected] = useState<{ client: ClientView; data: Ledger } | null>(null);
  const [clientModal, setClientModal] = useState<ClientRecord | "new" | null>(null);
  const [paymentClient, setPaymentClient] = useState("");
  const [editingPayment, setEditingPayment] = useState<string | undefined>();
  const [deferred, setDeferred] = useState<Deferral | null>(null);
  const [editDeferred, setEditDeferred] = useState<Deferral | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [facturaNueva, setFacturaNueva] = useState(false);
  const [processClient, setProcessClient] = useState<ClientView | null>(null);
  const [gestionesReload, setGestionesReload] = useState(0);
  const [gestiones, setGestiones] = useState<
    { id: string; clienteId: string; parentId: string | null; titulo: string; estado: string }[]
  >([]);
  const [paymentFilter, setPaymentFilter] = useState("");
  const allPayments = false;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("cliente");
    if (id) queueMicrotask(() => setPaymentFilter(id));
    const periodo = q.get("periodo") ?? q.get("period");
    if (periodo && validPeriod(periodo)) queueMicrotask(() => setPeriod(periodo));
  }, []);

  // Consulta de Obligaciones al backend. `load` arranca en "loading" y solo
  //   cambia cuando llega la respuesta (o al reintentar): así el efecto no
  //   hace setState sincrónico al montarse. `reload` fuerza recargar tras
  //   guardar o al pulsar «Reintentar».
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const params = new URLSearchParams();
        if (period) params.set("periodo", period);
        const r = await authenticatedFetch(
          `/obligaciones${params.toString() ? `?${params}` : ""}`,
          { signal: controller.signal },
        );
        if (!r.ok) {
          const body = await r.json().catch(() => null) as { message?: string | string[] } | null;
          const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
          throw new Error(message || `No se pudo cargar obligaciones (HTTP ${r.status}).`);
        }
        const data: ObligacionesResponse = await r.json();
        if (controller.signal.aborted) return;
        setServerData(data);
        setLoad("ready");
      } catch (e) {
        if (!controller.signal.aborted) {
          setLoad("error");
          setError(e instanceof Error ? e.message : "No se pudo conectar con el servidor.");
        }
      }
    })();
    return () => controller.abort();
  }, [reload, period]);

  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(
      `/gestiones?tipo=${encodeURIComponent("Formalización")}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) return;
        const rows = (await r.json()) as { clienteId: unknown; parentId: unknown }[];
        if (controller.signal.aborted || !Array.isArray(rows)) return;
        setGestiones(
          rows.map((g) => ({
            id: String((g as { id?: unknown }).id ?? ""),
            clienteId: String(g.clienteId),
            parentId: g.parentId === null || g.parentId === undefined ? null : String(g.parentId),
            titulo: String((g as { titulo?: unknown }).titulo ?? ""),
            estado: String((g as { estado?: unknown }).estado ?? ""),
          })),
        );
      })
      .catch(() => { /* sin conexión la tabla queda vacía */ });
    return () => controller.abort();
  }, [gestionesReload]);

  // Vistas cuya fuente de verdad es PostgreSQL: inicio, clientes, obligaciones,
  //   facturación y formalizaciones. Si el backend falla NO se cae al ledger
  //   local: se muestra el error y una lista vacía. El resto de vistas
  //   (pagos, postergaciones) usa el ledger local porque todavía no
  //   están migradas.
const isServerView =
    view === "inicio" ||
    view === "clientes" ||
    view === "obligaciones" ||
    view === "facturacion" ||
    view === "formalizaciones" ||
    view === "postergaciones" ||
    view === "pagos";
  const blankLedger: Ledger = {
    version: localData.version,
    clients: [],
    months: [],
    payments: [],
    revision: "",
    management: { profiles: {}, deferrals: [], invoices: [], processes: [] },
  };
  const vista: Ledger = isServerView
    ? (serverData ? serverToLedger(serverData, localData) : blankLedger)
    : localData;
  const metaVista = extra(vista);

  // Metadatos de cliente que vienen de la BD (`clientes`): la ficha necesita
  //   RUT, tipo, contacto, correo, dirección y estado, que no caben en el
  //   tipo Client del ledger (solo guarda id/nombre/teléfono).
  const clientMeta = new Map(
    (serverData?.clients ?? []).map((c) => [c.id, c] as const),
  );

  const clients: ClientView[] = vista.clients.map((c) => {
    const profile = metaVista.profiles[c.id];
    const meta = clientMeta.get(c.id);
    return {
      id: c.id,
      name: meta?.nombreRazonSocial || c.name,
      phone: meta?.telefono || c.phone,
      note: c.note,
      documentUrl: c.documentUrl,
      rut: meta?.rut ?? "",
      machine: profile?.machine || "",
      fee: profile?.fee || 0,
      active: profile?.active ?? (meta ? meta.estado.toLowerCase() !== "inactivo" : true),
      tipoCliente: meta?.tipoCliente || "",
      contactoPrincipal: meta?.contactoPrincipal || "",
      emailContacto: meta?.emailContacto || "",
      direccion: meta?.direccion || "",
      estadoCliente: meta?.estado || "",
    };
  });

  const visible = clients.filter(
    (c) =>
      `${c.name} ${c.rut}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")) &&
      (!machine || c.machine === machine) &&
      (!active || (active === "active") === c.active) &&
      (!status || totals(vista, getMonth(vista, c.id, period)).status === status) &&
      (!concept ||
        (view === "clientes"
          ? debt(vista, c.id, period, [concept as Concept])
          : balance(vista, getMonth(vista, c.id, period), concept as Concept)) > 0),
  );

  const openDeferrals = metaVista.deferrals.filter((d) => d.period <= period && deferralBalance(vista, d) > 0);

  function save(next: Ledger, revision = vista.revision) {
    const previo = vista;
    setError("");
    if (!isServerView) {
      persist(validateLedger(next), revision);
      setNotice("Cambios guardados.");
      return;
    }
    // Vistas con fuente en la BD: NO se confirma nada hasta tener respuesta
    //   del servidor. Si falla se avisa y se deja la ficha abierta para
    //   reintentar; no se cierra ni se recarga con datos no confirmados.
    return (async () => {
      try {
        const meses = next.months.filter((m) => {
          const antes = previo.months.find((x) => x.clientId === m.clientId && x.period === m.period);
          return !antes || !mesIgual(antes, m);
        });
        const avisos: string[] = [];
        for (const month of meses) {
          const cliente = clients.find((c) => c.id === month.clientId);
          if (!cliente) {
            avisos.push(`No se encontró el cliente del período ${month.period}.`);
            continue;
          }
          const aviso = await sincronizarMes(month, cliente);
          if (aviso) avisos.push(aviso);
        }
        // Sincronizar postergaciones (deferrals) al backend
        const avisoPostergaciones = await sincronizarPostergaciones(
          extra(next).deferrals,
          extra(previo).deferrals,
          next.payments,
          clients
        );
        if (avisoPostergaciones) avisos.push(avisoPostergaciones);
        if (avisos.length) throw new Error(avisos.join(" "));
        setReload((n) => n + 1);
        setSelected(null);
        setNotice(avisos.length
          ? `Guardado con avisos: ${avisos.join(" ")}`
          : "Cambios guardados en TRIBUTEK.");
        return true;
      } catch (e) {
        setError("No se pudo guardar en el servidor: "
          + (e instanceof Error ? e.message : String(e)));
        return false;
      }
    })();
  }

  function run(action: () => void) {
    try { action(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
  }

  async function removePayments(key: string) {
    if (!window.confirm("¿Eliminar el movimiento completo (todos sus conceptos) y recalcular sus saldos?")) return;
    try {
      const payment = vista.payments.find((p) => (p.transferId || p.id) === key);
      if (!payment) return;
      const response = await authenticatedFetch(`/payment-evidence/${payment.clientId}/${key}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo archivar la carpeta de comprobantes. El pago no fue eliminado.");
      save({ ...vista, payments: vista.payments.filter((p) => (p.transferId || p.id) !== key) });
    } catch (e) { setError((e as Error).message); }
  }

  const received = receivedByCategory(vista, period);
  const pendingMonths = clients.filter(
    (c) => vista.months.some((m) => m.clientId === c.id && m.period === period) && totals(vista, getMonth(vista, c.id, period)).status === "NO ENVIADO",
  );
  const payments = vista.payments.filter(
    (p) => (allPayments || p.date.slice(0, 7) === period) && (!paymentFilter || p.clientId === paymentFilter) && (!concept || p.concept === concept) &&
      `${clients.find((c) => c.id === p.clientId)?.name} ${clients.find((c) => c.id === p.clientId)?.rut} ${p.note}`.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = Array.from(new Set(payments.map((p) => p.transferId || p.id))).map((key) => {
    const rows = payments.filter((p) => (p.transferId || p.id) === key);
    return { key, rows, first: rows[0], amount: rows.reduce((s, p) => s + p.amount, 0) };
  });
  const dueRows = clients.flatMap((c) =>
    ["Cotizaciones", "Impuestos"].flatMap((co) => {
      const value = balance(vista, getMonth(vista, c.id, period), co as Concept);
      return value > 0 ? [{ client: c, concept: co, amount: value, day: co === "Cotizaciones" ? 12 : 20 }] : [];
    }),
  );

  // --- Facturación contra PostgreSQL --------------------------------------
  // QUÉ HACE: crea o edita una factura en el backend y devuelve la fila
  //   confirmada por el servidor. La vista se recarga con `setReload`.
  // EVITAR: reflejar el cambio en pantalla antes de la respuesta.
  async function guardarFactura(invoice: Invoice, esNueva: boolean) {
    const [anio, mes] = invoice.period.split("-");
    const url = esNueva
      ? `/facturas/${encodeURIComponent(invoice.clientId)}`
      : `/facturas/${encodeURIComponent(invoice.id)}`;
    const r = await authenticatedFetch(url, {
      method: esNueva ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anio: Number(anio),
        mes: Number(mes),
        kind: invoice.kind,
        name: invoice.name,
        rut: invoice.rut,
        amount: invoice.amount,
        description: invoice.description,
        number: invoice.number,
        date: invoice.date,
        note: invoice.note,
      }),
    });
    if (!r.ok) {
      const detalle = await r.json().catch(() => null) as { message?: string | string[] } | null;
      const message = Array.isArray(detalle?.message)
        ? detalle.message.join(" ")
        : detalle?.message;
      throw new Error(message || `No se pudo guardar la factura (HTTP ${r.status}).`);
    }
    return (await r.json()) as Invoice;
  }

  async function eliminarFactura(id: string) {
    const r = await authenticatedFetch(`/facturas/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const detalle = await r.json().catch(() => null) as { message?: string | string[] } | null;
      const message = Array.isArray(detalle?.message)
        ? detalle.message.join(" ")
        : detalle?.message;
      throw new Error(message || `No se pudo eliminar la factura (HTTP ${r.status}).`);
    }
  }

  // QUÉ HACE: prepara un servicio mensual por cliente activo que aún no tenga
  //   uno en el período. El monto sale de los Honorarios del mes guardado en
  //   PostgreSQL; si el cliente no tiene mes, queda en 0 (no hay columna de
  //   honorario acordado en la BD, así que no se inventa un valor).
  async function prepareInvoices() {
    const pendientes = visible.filter(
      (c) =>
        c.active &&
        !metaVista.invoices.some(
          (i) => i.clientId === c.id && i.period === period && i.kind === "monthly",
        ),
    );
    if (!pendientes.length) {
      setNotice("Todos los clientes activos ya tienen su servicio mensual de este período.");
      return;
    }
    if (!window.confirm(
      `¿Preparar servicios mensuales de ${periodLabel(period)} para ${pendientes.length} cliente(s)?`,
    )) return;
    setError("");
    try {
      for (const c of pendientes) {
        const honorarios = vista.months.some(
          (m) => m.clientId === c.id && m.period === period,
        )
          ? getMonth(vista, c.id, period).amounts.Honorarios
          : 0;
        await guardarFactura(
          {
            id: "",
            clientId: c.id,
            period,
            kind: "monthly",
            name: c.name,
            rut: c.rut,
            amount: honorarios,
            description: `Servicios mensuales ${periodLabel(period)}`,
            number: "",
            date: "",
            note: "",
          },
          true,
        );
      }
      setReload((n) => n + 1);
      setNotice(`Servicios mensuales preparados (${pendientes.length}) en TRIBUTEK.`);
    } catch (e) {
      setError(
        "No se pudieron preparar todos los servicios: "
        + (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  if (!store.ready) return <div className="tk"><Empty>Cargando gestión…</Empty></div>;

  return (
    <div className="tk">
      <header className="tk-header">
        <div>
          <p className="tk-eyebrow">TRIBUTEK / Gestión</p>
          <h1>{names[view]}</h1>
          <p className="tk-subtle">{viewDescriptions[view]}</p>
        </div>
        <div className="tk-actions">
          <button onClick={() => setHidden(!hidden)}>{hidden ? "Mostrar montos" : "Ocultar montos"}</button>
          {view === "clientes" && <button className="primary" onClick={() => setClientModal("new")}>Nuevo cliente</button>}
          {view === "pagos" && <button className="primary" disabled={!clients.length} onClick={() => { setEditingPayment(undefined); setPaymentClient(clients[0]?.id || ""); }}>Registrar pago</button>}
        </div>
      </header>
      {load === "error" && <div role="alert" className="tk-error">{error} <button onClick={() => { setLoad("loading"); setReload((n) => n + 1); setError(""); }}>Reintentar</button></div>}
      {notice && <p role="status" className="tk-success"><StatusMessage text={notice} /> <button onClick={() => setNotice("")}>Cerrar</button></p>}
      <div className="tk-toolbar">
        <Field label={view === "pagos" ? "Mes de recepción" : "Período de trabajo"}>
          <button type="button" className="tk-period-btn" onClick={() => { const el = document.querySelector<HTMLInputElement>(".tk-period-input"); el?.showPicker?.(); el?.focus(); }}>
            {period ? period.slice(0, 7) : "Seleccionar período"} <Icon name="calendar" className="h-4 w-4" />
          </button>
          <input type="month" className="tk-period-input" min="2000-01" max="2100-12" value={period} onChange={(e) => { if (e.target.value) { setPeriod(e.target.value); setSelected(null); } }} style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
        </Field>
        {view !== "inicio" && <label className="tk-field search"><span>Buscar cliente o RUT</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Razón social o RUT" /></label>}
        {(view === "clientes" || view === "obligaciones") && (
          <>
            <Field label="Concepto pendiente"><select value={concept} onChange={(e) => setConcept(e.target.value)}><option value="">Todos</option>{(view === "clientes" ? receivables : concepts).map((c) => <option key={conceptLabel(c)} value={c}>{conceptLabel(c)}</option>)}</select></Field>
            <details className="tk-details"><summary>Más filtros</summary><div className="tk-actions">
              <Field label="Estado del mes"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{["NO ENVIADO", "ENVIADO", "PAGADO"].map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Máquina"><select value={machine} onChange={(e) => setMachine(e.target.value)}><option value="">Todas</option>{Array.from(new Set(clients.map((c) => c.machine).filter(Boolean))).map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="Clientes"><select value={active} onChange={(e) => setActive(e.target.value)}><option value="">Activos e inactivos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></Field>
            </div></details>
          </>
        )}
      </div>
            <div className="tk-content">
        {load === "loading" && <p role="status" className="tk-subtle">Cargando datos de TRIBUTEK…</p>}
        {view === "inicio" && (
        <>
          <section className="tk-metrics-group tk-home-metrics-group" aria-label="Resumen del periodo">
            <h2 className="tk-metrics-group-label">Resumen del periodo</h2>
            <div className="tk-metrics">
            <Metric label="Recibido por servicios" help="Suma de los pagos recibidos durante el período seleccionado y registrados como servicios. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada."><Money value={received.services} hidden={hidden} /></Metric>
            <Metric label="Reembolsos recibidos" help="Suma de los abonos registrados como cobranza durante el período, excluidos los destinados a instituciones. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada."><Money value={received.reimbursements} hidden={hidden} /></Metric>
            <Metric label="Clientes con deuda de servicios" help="Cantidad de clientes con saldo pendiente en conceptos de servicios hasta el período seleccionado. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada.">{clients.filter((c) => debt(vista, c.id, period, services) > 0).length}</Metric>
            <Metric label="Postergaciones pendientes" help="Suma de los saldos pendientes de postergaciones con período igual o anterior al seleccionado. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada."><Money value={openDeferrals.reduce((s, d) => s + deferralBalance(vista, d), 0)} hidden={hidden} /></Metric>
            <Metric label="Obligaciones no enviadas" help="Cantidad de clientes con un registro del período seleccionado cuyo estado es “No enviado”. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada.">{pendingMonths.length}</Metric>
            </div>
          </section>
          <section className="tk-card">
            <div className="tk-card-head"><h2>Control de vencimientos</h2><Link className="tk-button" href={`/admin/obligaciones${period ? `?period=${period}` : ""}`}>Ver obligaciones</Link></div>
            <div className="tk-panel">
              <div className="tk-grid">
                {[{ c: "Cotizaciones", day: 12 }, { c: "Impuestos", day: 20 }].map(({ c, day }) => (
                  <div className="tk-due" key={conceptLabel(c)}>
                    <span>{conceptLabel(c)} · referencia interna día {day}</span>
                    <strong>{dueRows.filter((r) => r.concept === c).length} clientes</strong>
                    <Money value={dueRows.filter((r) => r.concept === c).reduce((s, r) => s + r.amount, 0)} hidden={hidden} />
                  </div>
                ))}
              </div>
            </div>
            {dueRows.length ? (
              <div className="tk-table-wrap">
                <table><thead><tr><th>Cliente</th><th>Concepto</th><th>Saldo</th><th></th></tr></thead><tbody>
                  {dueRows.map((r) => (
                    <tr key={r.client.id + r.concept}>
                      <td><strong>{r.client.name}</strong><small>{r.client.rut}</small></td>
                      <td>{conceptLabel(r.concept)}</td>
                      <td><Money value={r.amount} hidden={hidden} /></td>
                      <td><button disabled={hidden} onClick={() => setSelected({ client: r.client, data: vista })}>Ver ficha</button></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            ) : <Empty>No hay impuestos ni cotizaciones previsionales pendientes en este período.</Empty>}
          </section>
          <p className="tk-subtle">Ingresos: abonos de honorarios, formalización, cobranza y otro recibidos en {periodLabel(period)}. Las fechas de referencia no sustituyen el vencimiento confirmado del trámite.</p>
        </>
      )}
      {(view === "clientes" || view === "obligaciones") && (
        <>
          <section
            className="tk-metrics-group"
            aria-label={view === "clientes" ? "Resumen de clientes" : "Resumen de obligaciones del periodo"}
          >
            <h2 className="tk-metrics-group-label">
              {view === "clientes" ? "Resumen de clientes" : "Resumen de obligaciones del periodo"}
            </h2>
            <div className="tk-metrics">
              <Metric label="Clientes visibles" help="Cantidad de clientes que coinciden con la búsqueda y los filtros actuales.">{visible.length}</Metric>
              <Metric label="Con deuda de servicios" help="Cantidad de clientes visibles con saldo pendiente en conceptos de servicios hasta el período seleccionado. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada.">{visible.filter((c) => debt(vista, c.id, period, services) > 0).length}</Metric>
              <Metric label="Deuda acumulada con TRIBUTEK" help="Suma de los saldos pendientes de los clientes visibles hasta el período seleccionado. Indicador interno de TRIBUTEK; no tiene una definición oficial asignada."><Money value={visible.reduce((s, c) => s + debt(vista, c.id, period), 0)} hidden={hidden} /></Metric>
            </div>
          </section>
          <section className="tk-card">
            <div className="tk-card-head"><h2>Clientes</h2></div>
            <div className="tk-table-wrap">
              <table><thead><tr><th>Cliente</th><th>RUT</th><th>Deuda acumulada</th><th>Estado del mes</th><th>Estado</th><th>Máquina</th><th>Honorario</th><th></th></tr></thead><tbody>
                {visible.map((c) => {
                  const m = getMonth(vista, c.id, period);
                  const t = totals(vista, m);
                  // Misma función que usa el indicador "Deuda acumulada": así la
                  //   suma de esta columna coincide exactamente con la métrica.
                  const deuda = debt(vista, c.id, period);
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong><small>{c.rut}</small></td>
                      <td>{c.rut}</td>
                      <td>{deuda > 0 ? <strong><Money value={deuda} hidden={hidden} /></strong> : <Money value={deuda} hidden={hidden} />}</td>
                      <td><Badge>{t.status}</Badge></td>
                      <td>{c.estadoCliente || (c.active ? "Activo" : "Inactivo")}</td>
                      <td>{c.machine || "—"}</td>
                      <td><Money value={c.fee} hidden={hidden} /></td>
                      <td>
                        <div className="tk-actions">
                          {view !== "clientes" && <button disabled={hidden} onClick={() => setSelected({ client: c, data: vista })}>Ver ficha</button>}
                          {view === "clientes" && <button onClick={() => setClientModal(serverData?.clients.find((r) => r.id === c.id) ?? null)}>Editar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
            {load === "error" && <Empty>No se pudieron cargar los clientes desde TRIBUTEK. Revisa el mensaje de error y reintenta.</Empty>}
            {!visible.length && load === "ready" && <Empty>{search || status || concept ? "No hay clientes para estos filtros." : "No hay clientes registrados."}</Empty>}
          </section>
        </>
      )}
      {view === "facturacion" && (
        <>
          <div className="tk-actions" style={{ marginBottom: 20 }}>
            <button className="primary" onClick={prepareInvoices}>Preparar servicios mensuales</button>
            <button disabled={!visible.length} onClick={() => { const c = visible[0]; setInvoice({ id: "", clientId: c.id, name: c.name, rut: c.rut, period, kind: "extra", amount: 0, description: "", number: "", date: "", note: "" }); setFacturaNueva(true); }}>Agregar otro servicio</button>
          </div>
          {["monthly", "extra"].map((kind) => {
            // El buscador sigue aplicando: solo se muestran facturas de
            //   clientes que pasen el filtro de la vista.
            const delPeriodo = metaVista.invoices.filter(
              (i) => i.period === period && i.kind === kind,
            );
            const filas = delPeriodo.filter((i) => visible.some((c) => c.id === i.clientId));
            return (
            <section className="tk-card" key={kind}>
              <div className="tk-card-head"><h2>{kind === "monthly" ? "Servicios mensuales" : "Otros servicios"}</h2></div>
              {load === "error" && <Empty>No se pudieron cargar las facturas desde TRIBUTEK. Revisa el mensaje de error y reintenta.</Empty>}
              <div className="tk-table-wrap">
                <table><thead><tr>{["Nombre / RUT", "Honorarios", "Glosa", "N° factura", "Fecha", "Observación", ""].map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>
                  {filas.map((i) => (
                      <tr key={i.id}>
                        <td><strong>{i.name}</strong><small>{i.rut}</small></td>
                        <td><Money value={i.amount} hidden={hidden} /></td>
                        <td>{i.description}</td>
                        <td>{i.number || "—"}</td>
                        <td>{i.date || "—"}</td>
                        <td>{i.note || "—"}</td>
                        <td>
                          <div className="tk-actions">
                            <button disabled={hidden} onClick={() => { setInvoice({ ...i }); setFacturaNueva(false); }}>Editar</button>
                            <button
                              className="danger"
                              onClick={async () => {
                                if (!window.confirm("¿Eliminar esta factura?")) return;
                                setError("");
                                try {
                                  await eliminarFactura(i.id);
                                  setReload((n) => n + 1);
                                  setNotice("Factura eliminada en TRIBUTEK.");
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody></table>
              </div>
              {!filas.length && load === "ready" && <Empty>No hay {kind === "monthly" ? "servicios mensuales" : "otros servicios"} para este período.</Empty>}
            </section>
            );
          })}
          <section className="tk-card"><div className="tk-card-head"><h2>Comparativa mensual</h2></div><InvoiceComparison invoices={metaVista.invoices.filter((i) => i.period === period)} hidden={hidden} /></section>
        </>
      )}
      {view === "pagos" && (
        <>
          <section className="tk-card">
            <div className="tk-card-head"><h2>Historial de pagos</h2></div>
            <div className="tk-table-wrap">
              <table><thead><tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Monto</th><th>Método</th><th>Destino</th><th>Glosa</th><th></th></tr></thead><tbody>
                {groups.map((g) => (
                  <tr key={g.key}>
                    <td>{g.first.date}</td>
                    <td>
                      <strong>{clients.find((c) => c.id === g.first.clientId)?.name}</strong>
                      <small>{clients.find((c) => c.id === g.first.clientId)?.rut}</small>
                    </td>
                    <td>
                      {g.rows.map((r) => (
                        <span key={r.concept} style={{ display: "inline-block", marginRight: 8 }}>
                          {conceptLabel(r.concept)} <Money value={r.amount} hidden={hidden} />
                        </span>
                      ))}
                    </td>
                    <td><Money value={g.amount} hidden={hidden} /></td>
                    <td>{g.first.method}</td>
                    <td>{g.first.destination === "institution" ? "Institución" : "TRIBUTEK"}</td>
                    <td>{g.first.note || "—"}</td>
                    <td>
                      <div className="tk-actions">
                        <button disabled={hidden} onClick={() => { setEditingPayment(g.key); setPaymentClient(g.first.clientId); }}>Editar</button>
                        <button className="danger" onClick={() => removePayments(g.key)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            {!payments.length && <Empty>No hay pagos para estos filtros.</Empty>}
          </section>
        </>
      )}
      {view === "postergaciones" && (
        <>
          <section className="tk-card"><div className="tk-card-head"><h2>Postergaciones</h2></div><div className="tk-table-wrap"><table><thead><tr><th>Cliente</th><th>Concepto</th><th>Período</th><th>Monto</th><th>Vence</th><th>Saldo</th><th></th></tr></thead><tbody>
            {metaVista.deferrals.filter((d) => visible.some((c) => c.id === d.clientId) && d.period <= period).map((d) => {
              const left = deferralBalance(vista, d);
              const now = today();
              const near = new Date(`${now}T12:00:00`);
              const due = new Date(`${d.due}T12:00:00`);
              return (
                <tr key={d.id}><td><strong>{clients.find((c) => c.id === d.clientId)?.name}</strong><small>{clients.find((c) => c.id === d.clientId)?.rut}</small></td><td>{conceptLabel(d.concept)}</td><td>{d.period}</td><td><Money value={d.amount} hidden={hidden} /></td><td>{d.due} {left > 0 && due < near && <span className="tk-alert"> (próximo)</span>}</td><td><Money value={left} hidden={hidden} /></td><td><div className="tk-actions"><button disabled={hidden} onClick={() => setEditDeferred(d)}>Editar</button><button className="danger" onClick={() => { if (window.confirm("¿Eliminar la postergación y devolver el saldo a su período original?")) run(() => save(removeDeferral(vista, d.id))); }}>Eliminar</button></div></td></tr>
              );
            })}
          </tbody></table></div>{!metaVista.deferrals.length && <Empty>No hay postergaciones registradas.</Empty>}</section>
        </>
      )}
      {view === "formalizaciones" && (
        <>
          <section className="tk-card"><div className="tk-card-head"><h2>Creación de empresas</h2></div><div className="tk-table-wrap"><table><thead><tr><th>Cliente</th><th>Progreso</th><th>Próximo paso</th><th></th></tr></thead><tbody>
{visible.map((c) => {
                const cabecera = gestiones.find((g) => g.clienteId === c.id && !g.parentId);
                const all = cabecera ? gestiones.filter((g) => g.parentId === cabecera.id).filter((s) => s.estado !== "No corresponde") : [];
                const done = all.filter((s) => s.estado === "Completado").length;
                const processColor = !cabecera
                  ? "process-not-started"
                  : all.length > 0 && done === all.length
                    ? "process-complete"
                    : all.some((s) => s.estado === "En proceso")
                      ? "process-active"
                      : "process-pending";
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong><small>{c.rut}</small></td>
                    <td>{done}/{all.length || "—"}<div className="tk-progress"><span style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div></td>
                    <td>{all.find((s) => s.estado !== "Completado")?.titulo || (!cabecera ? "Sin iniciar" : "Completado")}</td>
                    <td><button className={processColor} onClick={() => setProcessClient(c)}>{cabecera ? "Ver proceso" : "Iniciar proceso"}</button></td>
                  </tr>
                );
              })}
          </tbody></table></div>{!visible.length && <Empty>No hay clientes para mostrar.</Empty>}</section>
        </>
      )}
      <details className="tk-privacy"><summary>Almacenamiento y respaldo</summary><p>Clientes y documentos: servidor. Gestión mensual, pagos, facturación y procesos: este navegador.</p><button onClick={() => downloadBlob(new Blob([JSON.stringify(vista, null, 2)], { type: "application/json" }), `tributek-respaldo-${today()}.json`)}>Descargar respaldo local</button><Field label="Restaurar respaldo JSON"><input type="file" accept=".json,application/json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const revision = vista.revision; try { if (file.size > 10000000) throw new Error("El respaldo supera 10 MB."); const restored = validateLedger(JSON.parse(await file.text())); if (window.confirm("Se reemplazará la gestión local por este respaldo. Descarga primero tu copia actual. ¿Continuar?")) save(restored, revision); } catch (error) { setError((error as Error).message); } e.target.value = ""; }} /></Field></details>
      {selected && <ClientSheet client={selected.client} data={selected.data} period={period} accumulated={view === "clientes"} save={save} onClose={() => setSelected(null)} hidden={hidden} />}
      {clientModal && <ClientCreateModal client={clientModal === "new" ? undefined : clientModal} onClose={() => setClientModal(null)} onSaved={() => { setReload((n) => n + 1); setNotice("Cliente guardado en el servidor. Comparte la invitación desde el formulario si se habilitó el portal."); }} />}
      {paymentClient && <Modal title={editingPayment ? "Corregir pago" : "Registrar pago"} onClose={() => setPaymentClient("")}><div className="tk-dialog-body">{!editingPayment && <Field label="Cliente"><select value={paymentClient} onChange={(e) => setPaymentClient(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}<PaymentForm key={paymentClient + (editingPayment || "")} data={vista} clientId={paymentClient} period={period} save={save} onClose={() => setPaymentClient("")} editingKey={editingPayment} /></div></Modal>}
      {deferred && <Modal title="Abonar postergación" onClose={() => setDeferred(null)}><div className="tk-dialog-body"><PaymentForm data={vista} clientId={deferred.clientId} period={period} deferredId={deferred.id} save={save} onClose={() => setDeferred(null)} /></div></Modal>}
      {editDeferred && <Modal title="Editar postergación" onClose={() => setEditDeferred(null)}><form className="tk-dialog-body tk-stack" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { save({ ...vista, management: { ...metaVista, deferrals: (vista.management?.deferrals ?? []).map((d) => d.id === editDeferred.id ? { ...d, amount: Number(f.get("amount")), due: String(f.get("due")), note: String(f.get("note")) } : d) } }); setEditDeferred(null); } catch (e) { setError((e as Error).message); } }}><Field label="Monto"><input name="amount" type="number" defaultValue={editDeferred.amount} required /></Field><Field label="Nuevo vencimiento"><input name="due" type="date" defaultValue={editDeferred.due} required /></Field><Field label="Observación"><textarea name="note" defaultValue={editDeferred.note} maxLength={500} /></Field><footer><button className="primary">Guardar</button></footer></form></Modal>}
      {invoice && (
        <Modal
          title={facturaNueva ? "Nueva factura" : "Editar factura"}
          onClose={() => setInvoice(null)}
        >
          <form
            className="tk-dialog-body tk-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              // El cliente no se cambia al editar: la fila mantiene su cliente
              //   salvo que el body lo indique (no lo hacemos desde aquí).
              const siguiente: Invoice = {
                ...invoice,
                amount: Number(f.get("amount")),
                description: String(f.get("description")),
                number: String(f.get("number")),
                date: String(f.get("date")),
                note: String(f.get("note")),
              };
              setError("");
              try {
                await guardarFactura(siguiente, facturaNueva);
                setReload((n) => n + 1);
                setInvoice(null);
                setNotice(
                  facturaNueva
                    ? "Factura creada en TRIBUTEK."
                    : "Cambios guardados en TRIBUTEK.",
                );
              } catch (err) {
                // Falló el backend: se conserva el formulario abierto con lo
                //   escrito para poder corregir y reintentar.
                setError((err as Error).message);
              }
            }}
          >
            <Field label="Cliente">
              <input value={clients.find((c) => c.id === invoice.clientId)?.name || invoice.name} readOnly />
            </Field>
            <Field label="Monto">
              <input name="amount" type="number" defaultValue={invoice.amount} required />
            </Field>
            <Field label="Glosa">
              <input name="description" defaultValue={invoice.description} required />
            </Field>
            <Field label="N° factura">
              <input name="number" defaultValue={invoice.number} />
            </Field>
            <Field label="Fecha">
              <input name="date" type="date" defaultValue={invoice.date} />
            </Field>
            <Field label="Observación">
              <textarea name="note" defaultValue={invoice.note} maxLength={1000} />
            </Field>
            <p className="tk-subtle">
              Los datos se guardan en PostgreSQL al confirmar.
            </p>
            <footer>
              <button className="primary">Guardar</button>
            </footer>
          </form>
        </Modal>
      )}
      {processClient && <Formalization client={processClient} period={period} onClose={() => setProcessClient(null)} onSaved={() => { setGestionesReload((n) => n + 1); }} />}
      </div>
    </div>
  );
}
