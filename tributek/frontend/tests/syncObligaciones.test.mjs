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
const ficha = compile(
  readFileSync(
    new URL("../app/components/ficha/model.ts", import.meta.url),
    "utf8",
  ),
);
const helpers = compile(
  readFileSync(
    new URL("../app/components/management/syncHelpers.ts", import.meta.url),
    "utf8",
  ).replaceAll('"../ficha/model"', JSON.stringify(ficha)),
);
const {
  adaptarAbono,
  adaptarFactura,
  adaptarMes,
  adaptarPostergacion,
  facturaIgual,
  mesIgual,
  payloadFactura,
  payloadMes,
  payloadPostergacion,
  postergacionIgual,
} = await import(helpers);
const { newMonth } = await import(ficha);

function pago(extra = {}) {
  return {
    id: "1",
    clientId: "7",
    period: "2026-09",
    concept: "Impuestos",
    amount: 100,
    date: "2026-09-10",
    note: "",
    createdAt: "2026-09-10",
    ...extra,
  };
}

function postergacion(extra = {}) {
  return {
    id: "1",
    clientId: "7",
    period: "2026-09",
    concept: "Honorarios",
    amount: 500,
    due: "2026-10-20",
    note: "",
    ...extra,
  };
}

function factura(extra = {}) {
  return {
    id: "1",
    clientId: "7",
    period: "2026-09",
    kind: "monthly",
    name: "Acme",
    rut: "12.345.678-9",
    amount: 1000,
    description: "Servicios mensuales 2026-09",
    number: "",
    date: "",
    note: "",
    ...extra,
  };
}

test("payloadMes arma el body del PUT sin los ids de pasos", () => {
  const month = newMonth("7", "2026-09");
  month.sent = true;
  month.steps = [{ id: "local-1", text: "llamar", done: false }];
  assert.deepEqual(payloadMes(month), {
    anio: 2026,
    mes: 9,
    sent: true,
    amounts: month.amounts,
    steps: [{ text: "llamar", done: false }],
    followDate: "",
    followNote: "",
    followDone: false,
  });
});

test("mesIgual ignora los ids de pasos del reemplazo del backend", () => {
  const month = newMonth("7", "2026-09");
  month.steps = [{ id: "local-1", text: "llamar", done: true }];
  const remoto = {
    ...JSON.parse(JSON.stringify(month)),
    steps: [{ id: "99", text: "llamar", done: true }],
  };
  assert.equal(mesIgual(month, remoto), true);
  assert.equal(mesIgual(month, { ...remoto, sent: true }), false);
});

test("adaptarMes convierte el mes del backend al shape local con ids de la BD", () => {
  const local = newMonth("7", "2026-09");
  local.amounts.Impuestos = 500;
  const remoto = {
    ...JSON.parse(JSON.stringify(local)),
    steps: [{ id: "99", text: "llamar", done: true }],
  };
  const adaptado = adaptarMes(remoto);
  assert.equal(adaptado.amounts.Impuestos, 500);
  assert.deepEqual(adaptado.steps, [{ id: "99", text: "llamar", done: true }]);
});

test("adaptarAbono adopta el id del backend por clave natural y conserva metadatos", () => {
  const local = [{
    ...pago({ id: "uuid-local", transferId: "t1", method: "Efectivo" }),
  }];
  const adaptado = adaptarAbono({ ...pago() }, local);
  assert.equal(adaptado.id, "1");
  assert.equal(adaptado.transferId, "t1");
  assert.equal(adaptado.method, "Efectivo");
});

test("adaptarAbono sin contraparte local crea el pago sin inventar metadatos", () => {
  const adaptado = adaptarAbono({ ...pago() }, []);
  assert.equal(adaptado.id, "1");
  assert.equal(adaptado.transferId, undefined);
  assert.equal(adaptado.method, undefined);
});

test("payloadPostergacion arma el body de POST/PUT sin el id", () => {
  assert.deepEqual(payloadPostergacion(postergacion()), {
    anio: 2026,
    mes: 9,
    concept: "Honorarios",
    amount: 500,
    due: "2026-10-20",
    note: "",
  });
});

test("payloadFactura arma el body de POST/PUT sin el id", () => {
  assert.deepEqual(payloadFactura(factura()), {
    anio: 2026,
    mes: 9,
    kind: "monthly",
    name: "Acme",
    rut: "12.345.678-9",
    amount: 1000,
    description: "Servicios mensuales 2026-09",
    number: "",
    date: "",
    note: "",
  });
});

test("postergacionIgual ignora el id y compara los campos persistidos", () => {
  const base = postergacion();
  assert.equal(postergacionIgual(base, { ...base, id: "99" }), true);
  assert.equal(postergacionIgual(base, { ...base, period: "2026-10" }), false);
  assert.equal(postergacionIgual(base, { ...base, concept: "Impuestos" }), false);
  assert.equal(postergacionIgual(base, { ...base, amount: 501 }), false);
  assert.equal(postergacionIgual(base, { ...base, due: "2026-10-21" }), false);
  assert.equal(postergacionIgual(base, { ...base, note: "x" }), false);
});

test("facturaIgual ignora el id y compara los campos persistidos", () => {
  const base = factura();
  assert.equal(facturaIgual(base, { ...base, id: "99" }), true);
  assert.equal(facturaIgual(base, { ...base, period: "2026-10" }), false);
  assert.equal(facturaIgual(base, { ...base, kind: "extra" }), false);
  assert.equal(facturaIgual(base, { ...base, amount: 1001 }), false);
  assert.equal(facturaIgual(base, { ...base, number: "123" }), false);
  assert.equal(facturaIgual(base, { ...base, date: "2026-09-15" }), false);
  assert.equal(facturaIgual(base, { ...base, note: "x" }), false);
});

test("adaptarPostergacion convierte la postergación del backend", () => {
  const adaptado = adaptarPostergacion(postergacion({ id: "42" }));
  assert.equal(adaptado.id, "42");
  assert.equal(adaptado.clientId, "7");
  assert.equal(adaptado.period, "2026-09");
  assert.equal(adaptado.concept, "Honorarios");
  assert.equal(adaptado.amount, 500);
  assert.equal(adaptado.due, "2026-10-20");
  assert.equal(adaptado.note, "");
});

test("adaptarFactura convierte la factura del backend", () => {
  const adaptado = adaptarFactura(
    factura({ id: "42", number: "123", date: "2026-09-15" }),
  );
  assert.equal(adaptado.id, "42");
  assert.equal(adaptado.clientId, "7");
  assert.equal(adaptado.period, "2026-09");
  assert.equal(adaptado.kind, "monthly");
  assert.equal(adaptado.amount, 1000);
  assert.equal(adaptado.number, "123");
  assert.equal(adaptado.date, "2026-09-15");
});
