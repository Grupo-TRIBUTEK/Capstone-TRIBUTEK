import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compile = (s) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(s, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64");
const base = compile(
  readFileSync(
    new URL("../app/components/ficha/model.ts", import.meta.url),
    "utf8",
  ),
);
const m = await import(
  compile(
    readFileSync(
      new URL("../app/components/management/model.ts", import.meta.url),
      "utf8",
    ).replaceAll('"../ficha/model"', JSON.stringify(base)),
  )
);
const { newMonth } = await import(base);
function fixture() {
  const a = newMonth("a", "2026-07"),
    b = newMonth("a", "2026-08");
  a.amounts.Honorarios = 100;
  a.amounts.Impuestos = 200;
  b.amounts.Honorarios = 100;
  return {
    version: 1,
    revision: "r",
    clients: [
      {
        id: "a",
        name: "Cliente de prueba",
        phone: "",
        note: "",
        documentUrl: "",
      },
    ],
    months: [a, b],
    payments: [],
  };
}
const payment = {
  clientId: "a",
  through: "2026-08",
  concept: "Todos",
  amount: 150,
  date: "2026-08-20",
  note: "Prueba",
  method: "Transferencia",
  destination: "tributek",
};
test("FIFO distribuye un pago por período y mantiene un movimiento agrupado", () => {
  const d = m.allocatePayment(fixture(), payment);
  assert.deepEqual(
    d.payments.map((p) => [p.period, p.concept, p.amount]),
    [
      ["2026-07", "Honorarios", 100],
      ["2026-07", "Impuestos", 50],
    ],
  );
  assert.equal(new Set(d.payments.map((p) => p.transferId)).size, 1);
  assert.equal(m.debt(d, "a", "2026-08"), 100);
});
test("pago por concepto no toca impuestos ni otros conceptos", () => {
  const d = m.allocatePayment(fixture(), { ...payment, concept: "Honorarios" });
  assert.deepEqual(
    d.payments.map((p) => p.amount),
    [100, 50],
  );
  assert.equal(m.balance(d, d.months[0], "Impuestos"), 200);
});
test("rechaza sobrepago sin escribir una distribución parcial", () => {
  const d = fixture();
  assert.throws(() => m.allocatePayment(d, { ...payment, amount: 401 }));
  assert.equal(d.payments.length, 0);
});
function postponed() {
  return m.postpone(fixture(), {
    id: "defer",
    clientId: "a",
    period: "2026-07",
    concept: "Impuestos",
    amount: 200,
    due: "2026-09-20",
    note: "",
  });
}
test("postergación conserva origen, sale del exigible y del mensaje", () => {
  const d = postponed();
  assert.equal(d.months[0].amounts.Impuestos, 200);
  assert.equal(m.totals(d, d.months[0]).total, 100);
  assert.equal(m.reportRows(d, "a", "2026-07", false).length, 1);
  assert.equal(m.deferralBalance(d, m.extra(d).deferrals[0]), 200);
});
test("pago todo excluye postergación y no duplica deuda", () => {
  const d = m.allocatePayment(postponed(), { ...payment, amount: 200 });
  assert.equal(m.debt(d, "a", "2026-08"), 0);
  assert.equal(m.deferralBalance(d, m.extra(d).deferrals[0]), 200);
});
test("abonar postergación no reabre el saldo del período", () => {
  const d = m.allocatePayment(postponed(), {
    ...payment,
    amount: 50,
    deferredId: "defer",
  });
  assert.equal(m.balance(d, d.months[0], "Impuestos"), 0);
  assert.equal(m.deferralBalance(d, m.extra(d).deferrals[0]), 150);
  assert.throws(() => m.removeDeferral(d, "defer"));
});
test("eliminar postergación sin abonos restaura saldo original", () => {
  const d = m.removeDeferral(postponed(), "defer");
  assert.equal(m.balance(d, d.months[0], "Impuestos"), 200);
});
test("reducir obligación bajo una postergación se rechaza", () => {
  const d = postponed();
  const month = {
    ...d.months[0],
    amounts: { ...d.months[0].amounts, Impuestos: 100 },
  };
  assert.throws(() => m.updateMonth(d, month));
});
test("corregir un movimiento reemplaza todos sus repartos atómicamente", () => {
  const original = m.allocatePayment(fixture(), payment);
  const key = original.payments[0].transferId;
  const base = {
    ...original,
    payments: original.payments.filter((p) => p.transferId !== key),
  };
  const updated = m.allocatePayment(base, {
    ...payment,
    amount: 40,
    concept: "Honorarios",
  });
  assert.equal(updated.payments.length, 1);
  assert.equal(m.debt(updated, "a", "2026-08"), 160);
  assert.equal(original.payments.length, 2);
});
test("datos antiguos sin gestión adicional conservan saldos e historial", () => {
  const d = fixture();
  assert.equal(m.validateLedger(d), d);
  assert.equal(m.debt(d, "a", "2026-08"), 200);
  assert.equal(m.extra(d).invoices.length, 0);
});

test("guarda y restaura pagos sin glosa conservando el método", () => {
  for (const method of ["Transferencia", "Efectivo", "Otro"]) {
    const d = m.allocatePayment(fixture(), { ...payment, note: "", method });
    const restored = m.validateLedger(d);
    assert.ok(restored.payments.every(p => p.note === "" && p.method === method));
  }
});
