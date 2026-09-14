export const concepts = [
  "Honorarios",
  "Impuestos",
  "Formalización",
  "Retención boletas",
  "Cotizaciones",
  "Postergación",
  "Convenio",
  "Cobranza",
  "Otro",
] as const;
export type Concept = (typeof concepts)[number];
export const services: readonly Concept[] = [
  "Honorarios",
  "Formalización",
  "Cobranza",
  "Otro",
];
export type Client = {
  id: string;
  name: string;
  phone: string;
  note: string;
  documentUrl: string;
};
export type Step = { id: string; text: string; done: boolean };
export type Month = {
  clientId: string;
  period: string;
  amounts: Record<Concept, number>;
  sent: boolean;
  steps: Step[];
  followDate: string;
  followNote: string;
  followDone: boolean;
};
export type Payment = {
  id: string;
  clientId: string;
  period: string;
  concept: Concept;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
};
export type Data = {
  version: 1;
  revision: string;
  clients: Client[];
  months: Month[];
  payments: Payment[];
};
export const emptyData: Data = {
  version: 1,
  revision: "initial",
  clients: [],
  months: [],
  payments: [],
};
export const money = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
export const validPeriod = (value: string) =>
  /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value);
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function newMonth(clientId: string, period: string): Month {
  return {
    clientId,
    period,
    amounts: Object.fromEntries(
      concepts.map((c) => [c, 0]),
    ) as Month["amounts"],
    sent: false,
    steps: [],
    followDate: "",
    followNote: "",
    followDone: false,
  };
}
export function paid(
  data: Data,
  clientId: string,
  period: string,
  concept?: Concept,
) {
  return data.payments
    .filter(
      (p) =>
        p.clientId === clientId &&
        p.period === period &&
        (!concept || p.concept === concept),
    )
    .reduce((sum, p) => sum + p.amount, 0);
}
export function summary(data: Data, month: Month) {
  const total = concepts.reduce((sum, c) => sum + month.amounts[c], 0);
  const received = paid(data, month.clientId, month.period);
  return {
    total,
    received,
    balance: total - received,
    status:
      total > 0 && received === total
        ? "PAGADO"
        : month.sent
          ? "ENVIADO"
          : "NO ENVIADO",
  };
}
export function serviceDebt(data: Data, clientId: string, through: string) {
  return data.months
    .filter((m) => m.clientId === clientId && m.period <= through)
    .reduce(
      (sum, m) =>
        sum +
        services.reduce(
          (subtotal, c) =>
            subtotal + m.amounts[c] - paid(data, clientId, m.period, c),
          0,
        ),
      0,
    );
}
export function validateClient(client: Client) {
  if (!client.name.trim() || client.name.length > 180)
    throw new Error("Escribe una razón social de hasta 180 caracteres.");
  if (client.note.length > 1000 || client.phone.length > 30)
    throw new Error("Revisa el largo de la nota o el teléfono.");
  if (client.documentUrl) {
    try {
      if (new URL(client.documentUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new Error(
        "El enlace documental debe comenzar con https:// y ser válido.",
      );
    }
    if (client.documentUrl.length > 500)
      throw new Error("El enlace admite hasta 500 caracteres.");
  }
}
export function saveMonth(data: Data, month: Month): Data {
  if (
    !data.clients.some((c) => c.id === month.clientId) ||
    !validPeriod(month.period)
  )
    throw new Error("Cliente o período inválido.");
  for (const c of concepts) {
    const amount = month.amounts[c];
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 999999999)
      throw new Error(
        "Los montos deben ser pesos enteros entre 0 y 999.999.999.",
      );
    if (amount < paid(data, month.clientId, month.period, c))
      throw new Error(
        `No puedes reducir ${c} por debajo de sus abonos registrados.`,
      );
  }
  if (month.followDate && !validDate(month.followDate))
    throw new Error("Fecha de seguimiento inválida.");
  if (month.followDone && !month.followDate)
    throw new Error(
      "Indica la fecha del seguimiento antes de marcarlo realizado.",
    );
  if (
    month.followNote.length > 500 ||
    month.steps.length > 20 ||
    month.steps.some((s) => !s.text.trim() || s.text.length > 180)
  )
    throw new Error("Revisa los pasos y el motivo del seguimiento.");
  const exists = data.months.some(
    (m) => m.clientId === month.clientId && m.period === month.period,
  );
  if (!exists && data.months.length >= 1200)
    throw new Error("Límite de períodos de ensayo alcanzado.");
  return {
    ...data,
    months: exists
      ? data.months.map((m) =>
          m.clientId === month.clientId && m.period === month.period
            ? month
            : m,
        )
      : [...data.months, month],
  };
}
export function addPayment(data: Data, payment: Payment): Data {
  const month = data.months.find(
    (m) => m.clientId === payment.clientId && m.period === payment.period,
  );
  if (!month || !concepts.includes(payment.concept))
    throw new Error("Guarda primero los conceptos de ese período.");
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0)
    throw new Error("El abono debe ser un monto entero mayor que cero.");
  if (!validDate(payment.date) || payment.date > today())
    throw new Error("Indica una fecha de pago válida, no futura.");
  if (!payment.note.trim() || payment.note.length > 300)
    throw new Error("Indica una glosa de hasta 300 caracteres.");
  if (
    payment.amount >
    month.amounts[payment.concept] -
      paid(data, payment.clientId, payment.period, payment.concept)
  )
    throw new Error(
      "El abono supera el saldo del concepto. Distribuye solo el monto que corresponde.",
    );
  if (
    data.payments.some((p) => p.id === payment.id) ||
    data.payments.length >= 5000
  )
    throw new Error("Abono duplicado o límite de ensayo alcanzado.");
  return { ...data, payments: [...data.payments, payment] };
}
export function message(
  data: Data,
  clientId: string,
  period: string,
  accumulated: boolean,
) {
  const client = data.clients.find((c) => c.id === clientId);
  const months = data.months
    .filter(
      (m) =>
        m.clientId === clientId &&
        (accumulated ? m.period <= period : m.period === period),
    )
    .sort((a, b) => a.period.localeCompare(b.period));
  const rows: string[] = [];
  let total = 0;
  for (const month of months) {
    const detail = (accumulated ? services : concepts).flatMap((c) => {
      const pending = month.amounts[c] - paid(data, clientId, month.period, c);
      if (!pending) return [];
      total += pending;
      return [`• ${c}: ${money(pending)}`];
    });
    if (detail.length) rows.push(`${month.period}\n${detail.join("\n")}`);
  }
  return `Hola, ${client?.name ?? "cliente"}.\n${accumulated ? "Cobros pendientes por servicios de TRIBUTEK hasta" : "Detalle pendiente del período"} ${period}.\n\n${rows.length ? rows.join("\n\n") : "Sin saldos pendientes registrados para esta selección."}\n\nTotal pendiente: ${money(total)}\nPor favor, envíanos el comprobante si ya realizaste el pago.`;
}
export function parseData(raw: string | null): Data {
  if (!raw) return emptyData;
  const data = JSON.parse(raw) as Data;
  if (
    data.version !== 1 ||
    typeof data.revision !== "string" ||
    !Array.isArray(data.clients) ||
    !Array.isArray(data.months) ||
    !Array.isArray(data.payments) ||
    data.clients.length > 100 ||
    data.months.length > 1200 ||
    data.payments.length > 5000
  )
    throw new Error("Formato de datos no reconocido.");
  const ids = new Set<string>();
  for (const client of data.clients) {
    if (
      ![
        client.id,
        client.name,
        client.phone,
        client.note,
        client.documentUrl,
      ].every((v) => typeof v === "string") ||
      !client.id ||
      ids.has(client.id)
    )
      throw new Error("Cliente inválido.");
    validateClient(client);
    ids.add(client.id);
  }
  const keys = new Set<string>();
  for (const m of data.months) {
    const key = `${m.clientId}/${m.period}`;
    if (
      keys.has(key) ||
      typeof m.sent !== "boolean" ||
      typeof m.followDone !== "boolean" ||
      typeof m.followDate !== "string" ||
      typeof m.followNote !== "string" ||
      !Array.isArray(m.steps) ||
      m.steps.some(
        (s) =>
          typeof s.id !== "string" ||
          typeof s.text !== "string" ||
          typeof s.done !== "boolean",
      ) ||
      new Set(m.steps.map((s) => s.id)).size !== m.steps.length
    )
      throw new Error("Período inválido.");
    saveMonth({ ...data, payments: [] }, m);
    keys.add(key);
  }
  let checked: Data = { ...data, payments: [] };
  for (const p of data.payments) {
    if (
      typeof p.id !== "string" ||
      !p.id ||
      typeof p.note !== "string" ||
      typeof p.date !== "string" ||
      typeof p.createdAt !== "string" ||
      Number.isNaN(Date.parse(p.createdAt))
    )
      throw new Error("Abono inválido.");
    checked = addPayment(checked, p);
  }
  return data;
}
