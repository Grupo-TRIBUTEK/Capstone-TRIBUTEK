import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  newMonth,
  saveMonth,
  addPayment,
  summary,
  serviceDebt,
  message,
  parseData,
  validateClient,
  validDate,
} from "../app/components/ficha/model.ts";
const client = {
  id: "ensayo",
  name: "Comercial Ejemplo",
  phone: "",
  note: "NOTA PRIVADA",
  documentUrl: "",
};
const base = { ...emptyData, clients: [client] };
const month = newMonth(client.id, "2026-08");
month.amounts.Honorarios = 10000;
month.amounts.Impuestos = 30000;
const data = saveMonth(base, month);
const payment = (patch = {}) => ({
  id: "p1",
  clientId: client.id,
  period: "2026-08",
  concept: "Impuestos",
  amount: 30000,
  date: "2026-08-20",
  note: "Transferencia A",
  createdAt: "2026-08-20T12:00:00Z",
  ...patch,
});
test("crear período conserva historial y separa clientes", () => {
  const other = { ...client, id: "otro" };
  const d = saveMonth(
    { ...data, clients: [client, other] },
    newMonth("otro", "2026-08"),
  );
  assert.equal(d.months.length, 2);
  assert.equal(saveMonth(d, newMonth(client.id, "2026-09")).months.length, 3);
  assert.equal(data.months.length, 1);
});
test("impuestos no se acumulan como servicios", () =>
  assert.equal(serviceDebt(data, client.id, "2026-08"), 10000));
test("abonar impuestos no reduce honorarios", () => {
  const d = addPayment(data, payment());
  assert.equal(summary(d, month).balance, 10000);
  assert.equal(serviceDebt(d, client.id, "2026-08"), 10000);
});
test("abonar honorarios reduce exclusivamente su saldo", () => {
  const d = addPayment(data, payment({ concept: "Honorarios", amount: 5000 }));
  assert.equal(serviceDebt(d, client.id, "2026-08"), 5000);
  assert.equal(summary(d, month).balance, 35000);
});
test("pago completo cambia a PAGADO y cero inicial no se considera pagado", () => {
  let d = addPayment(data, payment());
  d = addPayment(
    d,
    payment({ id: "p2", concept: "Honorarios", amount: 10000 }),
  );
  assert.equal(summary(d, month).status, "PAGADO");
  assert.equal(
    summary(base, newMonth(client.id, "2026-09")).status,
    "NO ENVIADO",
  );
});
test("envío manual y pago parcial conservan ENVIADO", () => {
  const sent = { ...month, sent: true };
  const d = addPayment(
    saveMonth(base, sent),
    payment({ concept: "Honorarios", amount: 5000 }),
  );
  assert.equal(summary(d, sent).status, "ENVIADO");
});
test("rechaza sobrepago, negativos, fracciones y glosa vacía", () => {
  for (const patch of [
    { amount: 30001 },
    { amount: 0 },
    { amount: -1 },
    { amount: 1.5 },
    { note: " " },
  ])
    assert.throws(() => addPayment(data, payment(patch)));
});
test("rechaza reducir concepto debajo del abono", () => {
  const d = addPayment(data, payment());
  assert.throws(() =>
    saveMonth(d, { ...month, amounts: { ...month.amounts, Impuestos: 20000 } }),
  );
});
test("mensaje acumulado excluye impuestos e información interna", () => {
  const result = message(data, client.id, "2026-08", true);
  assert.ok(result.includes("Honorarios"));
  assert.ok(!result.includes("Impuestos"));
  assert.ok(!result.includes("NOTA PRIVADA"));
  assert.ok(message(data, client.id, "2026-08", false).includes("Impuestos"));
});
test("saldos de otros períodos no entran en obligación mensual", () => {
  const next = newMonth(client.id, "2026-09");
  next.amounts.Cobranza = 2000;
  const d = saveMonth(data, next);
  assert.equal(serviceDebt(d, client.id, "2026-08"), 10000);
  assert.equal(serviceDebt(d, client.id, "2026-09"), 12000);
  assert.ok(!message(d, client.id, "2026-09", false).includes("Honorarios"));
});
test("persistencia conserva checklist, fecha y notas", () => {
  const d = saveMonth(data, {
    ...month,
    steps: [{ id: "1", text: "Revisar", done: true }],
    followDate: "2026-08-25",
    followNote: "Contactar",
  });
  assert.deepEqual(parseData(JSON.stringify(d)), d);
});
test("rechaza datos corruptos y duplicación de pagos", () => {
  assert.throws(() => parseData("{"));
  assert.throws(() =>
    parseData(JSON.stringify({ ...data, months: [month, month] })),
  );
  const d = addPayment(data, payment());
  assert.throws(() => addPayment(d, payment()));
});
test("rechaza enlaces inseguros y fechas imposibles", () => {
  assert.throws(() =>
    validateClient({ ...client, documentUrl: "javascript:alert(1)" }),
  );
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
});
