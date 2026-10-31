/**
 * Adaptadores entre el formato del backend y la ficha. Separan diferencias de nombres e identificadores de la lógica visual.
 */
// Helpers puros de sincronización de Obligaciones con el backend.
// QUÉ HACE: transformaciones del ledger local contra la respuesta de
//   `GET /obligaciones/meses/:clienteId` — sin fetch, para poder testearlos.
// REGLA: el backend es la fuente de verdad de meses, abonos,
//   postergaciones y facturas. Cuando un cliente se hidrata bien, su
//   parte local se REEMPLAZA por lo del servidor (lo local que no está
//   en la BD se descarta). Si el GET de un cliente falla, su parte
//   local se deja intacta.
// EVITAR: importar aquí de auth-client u otro módulo con efectos; este
//   archivo debe ser importable en tests de Node sin browser.
import type { Month, Payment, Step, Concept } from "../ficha/model";
import type { AppliedPayment, Deferral, Invoice } from "./model";

// Shape crudo de un mes en la respuesta del backend (espejo de MesForma en
// obligaciones.service.ts — steps ya vienen {id, text, done}).
export type MesRemoto = {
  clientId: string;
  period: string;
  amounts: Record<string, number>;
  sent: boolean;
  steps: { id: string; text: string; done: boolean }[];
  followDate: string;
  followNote: string;
  followDone: boolean;
};

// Shape crudo de un abono (espejo de AbonoForma). Los metadatos de
//   transferencia viajan en la fila: un pago del formulario se reparte
//   en varias filas que comparten `transferId`.
export type AbonoRemoto = {
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
};

// Shape crudo de una postergación (espejo de PostergacionForma).
export type PostergacionRemota = {
  id: string;
  clientId: string;
  period: string;
  concept: string;
  amount: number;
  due: string;
  note: string;
};

// Shape crudo de una factura (espejo de FacturaForma).
export type FacturaRemota = {
  id: string;
  clientId: string;
  period: string;
  kind: string;
  name: string;
  rut: string;
  amount: number;
  description: string;
  number: string;
  date: string;
  note: string;
};

// QUÉ HACE: body de PUT /obligaciones/mes/:clienteId — espejo del DTO del
//   backend. Los `id` de los pasos locales se descartan: el renglón de la BD
//   tiene autoincrement propio.
export function payloadMes(month: Month) {
  const [anio, mes] = month.period.split("-").map(Number);
  return {
    anio,
    mes,
    sent: month.sent,
    amounts: month.amounts,
    steps: month.steps.map((s) => ({ text: s.text, done: s.done })),
    followDate: month.followDate,
    followNote: month.followNote,
    followDone: month.followDone,
  };
}

// QUÉ HACE: body de POST/PUT de postergación — espejo de
//   GuardarPostergacionDto.
export function payloadPostergacion(d: Deferral) {
  const [anio, mes] = d.period.split("-").map(Number);
  return {
    anio,
    mes,
    concept: d.concept,
    amount: d.amount,
    due: d.due,
    note: d.note,
  };
}

// QUÉ HACE: body de POST/PUT de factura — espejo de
//   GuardarFacturaDto.
export function payloadFactura(inv: Invoice) {
  const [anio, mes] = inv.period.split("-").map(Number);
  return {
    anio,
    mes,
    kind: inv.kind,
    name: inv.name,
    rut: inv.rut,
    amount: inv.amount,
    description: inv.description,
    number: inv.number,
    date: inv.date,
    note: inv.note,
  };
}

// QUÉ HACE: compara dos meses por los campos que persiste el backend (ignora
//   los `id` de los pasos, que cambian en cada reemplazo). Lo usa el Workspace
//   para decidir si un mes requiere PUT.
export function mesIgual(a: Month | MesRemoto, b: Month | MesRemoto): boolean {
  /** Produce una representación ordenada de conceptos y montos para comparar dos meses. */
  const claves = (m: { amounts: Record<string, number> }) =>
    Object.keys(m.amounts)
      .sort()
      .map((c) => `${c}:${m.amounts[c]}`)
      .join("|");
  return (
    a.sent === b.sent &&
    a.followDate === b.followDate &&
    a.followNote === b.followNote &&
    a.followDone === b.followDone &&
    claves(a) === claves(b) &&
    a.steps.length === b.steps.length &&
    a.steps.every((s, i) => s.text === b.steps[i]?.text && s.done === b.steps[i]?.done)
  );
}

// QUÉ HACE: compara una postergación remota contra su contraparte local
//   por los campos que persiste el backend. Lo usa el Workspace para
//   decidir si requiere PUT.
export function postergacionIgual(
  a: PostergacionRemota | Deferral,
  b: PostergacionRemota | Deferral,
): boolean {
  return (
    a.period === b.period &&
    a.concept === b.concept &&
    a.amount === b.amount &&
    a.due === b.due &&
    a.note === b.note
  );
}

// QUÉ HACE: compara una factura remota contra su contraparte local por
//   los campos que persiste el backend (el cliente se compara aparte,
//   en el body del PUT).
export function facturaIgual(
  a: FacturaRemota | Invoice,
  b: FacturaRemota | Invoice,
): boolean {
  return (
    a.period === b.period &&
    a.kind === b.kind &&
    a.name === b.name &&
    a.rut === b.rut &&
    a.amount === b.amount &&
    a.description === b.description &&
    a.number === b.number &&
    a.date === b.date &&
    a.note === b.note
  );
}

// QUÉ HACE: adapta un mes del backend al shape `Month` local (los `id` de los
//   pasos son los de la BD).
export function adaptarMes(r: MesRemoto): Month {
  return {
    clientId: r.clientId,
    period: r.period,
    amounts: { ...r.amounts } as Month["amounts"],
    sent: r.sent,
    steps: r.steps.map((s): Step => ({ id: s.id, text: s.text, done: s.done })),
    followDate: r.followDate,
    followNote: r.followNote,
    followDone: r.followDone,
  };
}

// QUÉ HACE: adapta un abono del backend al shape local. Los metadatos
//   (transferId, method, cuentas, destination) los da el servidor —
//   ya son columnas de `abonos_mes` — y se conservan los locales
//   solo cuando el servidor aún no los tiene (filas anteriores a
//   la migración o abonos cuyo POST falló). Se empareja la
//   contraparte local por id de la BD, o por clave natural si el
//   local aún tiene id temporal (UUID anterior al POST).
// EVITAR: inventar método o cuentas cuando no hay contraparte local.
export function adaptarAbono(r: AbonoRemoto, locales: AppliedPayment[]): AppliedPayment {
  /** Compara la identidad funcional del abono cuando cambió su ID entre la copia local y la base. */
  const mismaClave = (p: AppliedPayment) =>
    p.clientId === r.clientId &&
    p.period === r.period &&
    p.concept === r.concept &&
    p.amount === r.amount &&
    p.date === r.date;
  const previo =
    locales.find((p) => p.id === r.id) ??
    locales.find((p) => !/^\d+$/.test(p.id) && mismaClave(p));
  return {
    id: r.id,
    clientId: r.clientId,
    period: r.period,
    concept: r.concept as Payment["concept"],
    amount: r.amount,
    date: r.date,
    note: r.note,
    createdAt: r.createdAt,
    transferId: r.transferId ?? previo?.transferId,
    method: r.method ?? previo?.method,
    originAccount: r.originAccount ?? previo?.originAccount,
    receivingAccount: r.receivingAccount ?? previo?.receivingAccount,
    destination: (r.destination ?? previo?.destination) as AppliedPayment["destination"],
    ...(r.deferredId ? { deferredId: r.deferredId } : {}),
  };
}

// QUÉ HACE: adapta una postergación del backend al shape `Deferral` local.
export function adaptarPostergacion(r: PostergacionRemota): Deferral {
  return {
    id: r.id,
    clientId: r.clientId,
    period: r.period,
    concept: r.concept as Concept,
    amount: r.amount,
    due: r.due,
    note: r.note,
  };
}

// QUÉ HACE: adapta una factura del backend al shape `Invoice` local.
export function adaptarFactura(r: FacturaRemota): Invoice {
  return {
    id: r.id,
    clientId: r.clientId,
    period: r.period,
    kind: r.kind as Invoice["kind"],
    name: r.name,
    rut: r.rut,
    amount: r.amount,
    description: r.description,
    number: r.number,
    date: r.date,
    note: r.note,
  };
}
