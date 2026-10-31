/** Pruebas del contrato del asistente: simulan HTTP, sin Ollama ni cuentas reales. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compile = (source) => "data:text/javascript;base64," +
  Buffer.from(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText).toString("base64");
const auth = compile(readFileSync(new URL("../app/features/auth/auth-client.ts", import.meta.url), "utf8"));
const source = readFileSync(new URL("../app/components/ia/consultar.ts", import.meta.url), "utf8");
const { consultarAsistente } = await import(compile(source.replace(
  '"../../features/auth/auth-client"', JSON.stringify(auth)
)));
/** Aísla las API del navegador y restaura el entorno al terminar cada prueba. */
async function withResponse(t, response, action) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true, value: { localStorage: { getItem: () => "token-de-ensayo" } },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  });
  await action(t.mock.method(globalThis, "fetch", async () => response));
}
test("envía pregunta y ruta con autenticación y recorta la respuesta", async (t) => {
  await withResponse(t, Response.json({ respuesta: "  Respuesta de ensayo  " }), async (mock) => {
    assert.equal(await consultarAsistente("Pregunta", "/admin/pagos"), "Respuesta de ensayo");
    const [url, init] = mock.mock.calls[0].arguments;
    assert.equal(url, "/ia/consultas");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.get("Authorization"), "Bearer token-de-ensayo");
    assert.deepEqual(JSON.parse(init.body), { consulta: "Pregunta", contexto: "/admin/pagos" });
  });
});
test("conserva los errores de validación recibidos como lista", async (t) => {
  await withResponse(t, Response.json({ message: ["Consulta inválida.", "Revisa su largo."] }, { status: 400 }), async () => {
    await assert.rejects(consultarAsistente("x", "/admin"), { message: "Consulta inválida. Revisa su largo." });
  });
});
test("conserva el error del servidor recibido como texto", async (t) => {
  await withResponse(t, Response.json({ message: "Sesión vencida." }, { status: 401 }), async () => {
    await assert.rejects(consultarAsistente("x", "/admin"), { message: "Sesión vencida." });
  });
});
test("usa el error alternativo cuando falla el servidor sin JSON", async (t) => {
  await withResponse(t, new Response("sin servicio", { status: 502 }), async () => {
    await assert.rejects(consultarAsistente("x", "/admin"), { message: "No se pudo obtener una respuesta. Inténtalo de nuevo." });
  });
});
test("rechaza respuestas vacías aunque el estado HTTP indique éxito", async (t) => {
  await withResponse(t, Response.json({ respuesta: "   " }), async () => {
    await assert.rejects(consultarAsistente("x", "/admin"), { message: "El asistente devolvió una respuesta vacía." });
  });
});
