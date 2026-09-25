import {
  addPayment,
  concepts,
  newMonth,
  paid,
  parseData,
  saveMonth,
  services,
  today,
  validDate,
  validPeriod,
  type Concept,
  type Data,
  type Month,
  type Payment,
} from "../ficha/model";
export type { Concept } from "../ficha/model";

export type Profile = {
  rut: string;
  machine: string;
  fee: number;
  active: boolean;
  commune?: string;
  taxRegime?: string;
  startedAt?: string;
};
export type Deferral = {
  id: string;
  clientId: string;
  period: string;
  concept: Concept;
  amount: number;
  due: string;
  note: string;
};
export type Invoice = {
  id: string;
  clientId: string;
  period: string;
  kind: "monthly" | "extra";
  name: string;
  rut: string;
  amount: number;
  description: string;
  number: string;
  date: string;
  note: string;
};
export const processSteps = [
  "Reunión inicial",
  "Estatutos",
  "Verificación del representante legal",
  "Inicio de actividades",
  "Clave tributaria",
  "e-RUT",
  "Inscripción en boleta electrónica",
  "Inscripción en facturador electrónico",
  "Modelo de emisión de boletas",
  "Banco",
  "Verificación de actividades",
];
export const stepStates = [
  "Pendiente",
  "En proceso",
  "Completado",
  "No corresponde",
] as const;
export type ProcessStep = {
  name: string;
  state: (typeof stepStates)[number];
  date: string;
};
export type Process = { clientId: string; steps: ProcessStep[]; note: string };
export type AppliedPayment = Payment & {
  transferId?: string;
  deferredId?: string;
  method?: string;
  destination?: "tributek" | "institution";
};
export type Management = {
  profiles: Record<string, Profile>;
  deferrals: Deferral[];
  invoices: Invoice[];
  processes: Process[];
};
export type Ledger = Omit<Data, "payments"> & {
  management?: Management;
  payments: AppliedPayment[];
};
export const blankManagement = (): Management => ({
  profiles: {},
  deferrals: [],
  invoices: [],
  processes: [],
});
export const extra = (data: Data): Management =>
  (data as Ledger).management ?? blankManagement();
export const getMonth = (data: Data, id: string, period: string) =>
  data.months.find((m) => m.clientId === id && m.period === period) ??
  newMonth(id, period);
export const deferralPaid = (data: Data, id: string) =>
  (data.payments as AppliedPayment[])
    .filter((p) => p.deferredId === id)
    .reduce((s, p) => s + p.amount, 0);
export const deferralBalance = (data: Data, d: Deferral) =>
  d.amount - deferralPaid(data, d.id);
export function balance(data: Data, m: Month, concept: Concept) {
  const deferred = extra(data)
    .deferrals.filter(
      (d) =>
        d.clientId === m.clientId &&
        d.period === m.period &&
        d.concept === concept,
    )
    .reduce((s, d) => s + deferralBalance(data, d), 0);
  return (
    m.amounts[concept] - paid(data, m.clientId, m.period, concept) - deferred
  );
}
export function totals(data: Data, m: Month) {
  const pending = concepts.reduce((s, c) => s + balance(data, m, c), 0);
  const deferred = extra(data)
    .deferrals.filter((d) => d.clientId === m.clientId && d.period === m.period)
    .reduce((s, d) => s + d.amount, 0);
  const received = (data.payments as AppliedPayment[])
    .filter(
      (p) =>
        p.clientId === m.clientId && p.period === m.period && !p.deferredId,
    )
    .reduce((s, p) => s + p.amount, 0);
  const total = concepts.reduce((s, c) => s + m.amounts[c], 0) - deferred;
  return {
    total,
    received,
    pending,
    status:
      total > 0 && pending === 0 ? "PAGADO" : m.sent ? "ENVIADO" : "NO ENVIADO",
  };
}
export function debt(
  data: Data,
  clientId: string,
  period: string,
  selection: readonly Concept[] = services,
) {
  return data.months
    .filter((m) => m.clientId === clientId && m.period <= period)
    .reduce(
      (s, m) => s + selection.reduce((n, c) => n + balance(data, m, c), 0),
      0,
    );
}
export function validateLedger(data: Ledger): Ledger {
  parseData(JSON.stringify(data));
  const e = extra(data),
    ids = new Set<string>();
  if (
    !e.profiles ||
    !Array.isArray(e.deferrals) ||
    !Array.isArray(e.invoices) ||
    !Array.isArray(e.processes)
  )
    throw new Error("Respaldo de gestión inválido.");
  const client = (id: string) => data.clients.some((c) => c.id === id);
  for (const d of e.deferrals) {
    if (
      ids.has(d.id) ||
      !d.id ||
      !client(d.clientId) ||
      !validPeriod(d.period) ||
      !data.months.some(
        (m) => m.clientId === d.clientId && m.period === d.period,
      ) ||
      !concepts.includes(d.concept) ||
      !Number.isSafeInteger(d.amount) ||
      d.amount <= 0 ||
      !validDate(d.due) ||
      d.due < `${d.period}-01` ||
      d.note.length > 500
    )
      throw new Error("Revisa los datos de la postergación.");
    ids.add(d.id);
    if (deferralBalance(data, d) < 0)
      throw new Error("La postergación tiene abonos superiores a su monto.");
  }
  for (const p of data.payments) {
    if (p.destination && !["tributek", "institution"].includes(p.destination))
      throw new Error("Destino de pago inválido.");
    if (p.deferredId) {
      const d = e.deferrals.find((d) => d.id === p.deferredId);
      if (
        !d ||
        d.clientId !== p.clientId ||
        d.period !== p.period ||
        d.concept !== p.concept
      )
        throw new Error("El abono no corresponde a la postergación.");
    }
  }
  for (const m of data.months)
    for (const c of concepts)
      if (balance(data, m, c) < 0)
        throw new Error(
          "El monto no puede ser menor que sus abonos y postergaciones.",
        );
  for (const inv of e.invoices) {
    if (
      ids.has(inv.id) ||
      !inv.id ||
      !["monthly", "extra"].includes(inv.kind) ||
      !client(inv.clientId) ||
      !validPeriod(inv.period) ||
      !Number.isSafeInteger(inv.amount) ||
      inv.amount < 0 ||
      !inv.description.trim() ||
      inv.description.length > 300 ||
      inv.note.length > 1000 ||
      (inv.date && !validDate(inv.date))
    )
      throw new Error("Revisa la fila de facturación.");
    if (Boolean(inv.number.trim()) !== Boolean(inv.date))
      throw new Error("Completa número y fecha de factura juntos.");
    ids.add(inv.id);
  }
  for (const p of e.processes) {
    if (
      !client(p.clientId) ||
      p.steps.some(
        (s) => !stepStates.includes(s.state) || (s.date && !validDate(s.date)),
      )
    )
      throw new Error("Revisa los pasos de formalización.");
  }
  for (const p of Object.values(e.profiles))
    if (!Number.isSafeInteger(p.fee) || p.fee < 0 || p.fee > 999999999)
      throw new Error("El honorario debe ser un monto entero válido.");
  return data;
}
export function updateMonth(data: Ledger, month: Month): Ledger {
  return validateLedger(saveMonth(data, month) as Ledger);
}
export function postpone(data: Ledger, d: Deferral): Ledger {
  const e = extra(data);
  if (e.deferrals.some((x) => x.id === d.id))
    throw new Error("Postergación duplicada.");
  if (d.amount > balance(data, getMonth(data, d.clientId, d.period), d.concept))
    throw new Error("El monto supera el saldo disponible.");
  return validateLedger({
    ...data,
    management: { ...e, deferrals: [...e.deferrals, d] },
  });
}
export function removeDeferral(data: Ledger, id: string): Ledger {
  if (deferralPaid(data, id) > 0)
    throw new Error(
      "Corrige primero los abonos asociados a esta postergación.",
    );
  return validateLedger({
    ...data,
    management: {
      ...extra(data),
      deferrals: extra(data).deferrals.filter((d) => d.id !== id),
    },
  });
}
export type PaymentInput = {
  clientId: string;
  through: string;
  concept: Concept | "Todos";
  amount: number;
  date: string;
  note: string;
  method: string;
  destination: "tributek" | "institution";
  deferredId?: string;
};
export function allocatePayment(data: Ledger, input: PaymentInput): Ledger {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !validDate(input.date) ||
    input.date > today() ||
    !input.note.trim()
  )
    throw new Error("Completa monto, fecha y descripción del pago.");
  let remaining = input.amount;
  let next = data;
  const transferId = crypto.randomUUID();
  const lines: { month: Month; concept: Concept; amount: number }[] = [];
  if (input.deferredId) {
    const d = extra(data).deferrals.find(
      (d) => d.id === input.deferredId && d.clientId === input.clientId,
    );
    if (!d) throw new Error("No se encontró la postergación.");
    lines.push({
      month: getMonth(data, d.clientId, d.period),
      concept: d.concept,
      amount: deferralBalance(data, d),
    });
  } else
    for (const m of data.months
      .filter((m) => m.clientId === input.clientId && m.period <= input.through)
      .sort((a, b) => a.period.localeCompare(b.period))) {
      for (const c of concepts.filter(
        (c) => input.concept === "Todos" || c === input.concept,
      ))
        lines.push({ month: m, concept: c, amount: balance(data, m, c) });
    }
  if (lines.reduce((s, l) => s + l.amount, 0) < remaining)
    throw new Error("El pago supera el saldo de la selección.");
  for (const l of lines) {
    if (!remaining) break;
    const amount = Math.min(remaining, l.amount);
    if (amount <= 0) continue;
    const p: AppliedPayment = {
      id: crypto.randomUUID(),
      transferId,
      clientId: input.clientId,
      period: l.month.period,
      concept: l.concept,
      amount,
      date: input.date,
      note: input.note,
      createdAt: new Date().toISOString(),
      method: input.method,
      destination: input.destination,
      ...(input.deferredId ? { deferredId: input.deferredId } : {}),
    };
    next = addPayment(next, p) as Ledger;
    remaining -= amount;
  }
  return validateLedger(next);
}
export function periodLabel(period: string) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${period}-15T12:00:00`));
}
export function suggestedDue(period: string, months = 2, day = 20) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + months, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function reportRows(
  data: Data,
  clientId: string,
  period: string,
  accumulated: boolean,
) {
  return data.months
    .filter(
      (m) =>
        m.clientId === clientId &&
        (accumulated ? m.period <= period : m.period === period),
    )
    .sort((a, b) => a.period.localeCompare(b.period))
    .flatMap((m) =>
      (accumulated ? services : concepts)
        .map((c) => ({
          period: m.period,
          concept: c,
          amount: balance(data, m, c),
        }))
        .filter((r) => r.amount > 0),
    );
}
