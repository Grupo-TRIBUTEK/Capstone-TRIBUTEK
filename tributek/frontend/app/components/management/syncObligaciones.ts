/**
 * Sincroniza cambios de gestión con el backend y reconstruye el registro que usa la interfaz.
 */
// Sincronización de la vista Obligaciones con el backend (opción B).
// QUÉ HACE: empuja los cambios del ledger local a /obligaciones después de
//   persistir (PUT de meses, POST de abonos nuevos, DELETE de quitados,
//   POST/PUT/DELETE de postergaciones y facturas) y reemplaza lo local por
//   lo del servidor al montar el Workspace (GET por cliente).
//   Mismo contrato de UX que F29: el local SIEMPRE se guarda primero; el
//   servidor es respaldo y se avisa cuando la sincronización falla.
import { authenticatedFetch } from "../../features/auth/auth-client";
import { normalizeRut } from "../f29/model";
import type { Month } from "../ficha/model";
import {
  extra,
  type AppliedPayment,
  type Deferral,
  type Invoice,
  type Ledger,
} from "./model";
import {
  adaptarAbono,
  adaptarFactura,
  adaptarMes,
  adaptarPostergacion,
  facturaIgual,
  payloadFactura,
  payloadMes,
  payloadPostergacion,
  postergacionIgual,
  type AbonoRemoto,
  type FacturaRemota,
  type MesRemoto,
  type PostergacionRemota,
} from "./syncHelpers";

// QUÉ HACE: resuelve el id real de la BD para un cliente local. Los clientes
//   ya traen el id de la BD tras syncRemoteClients; si el id local no es
//   numérico (aún no sincronizado), busca por RUT — mismo criterio que
//   syncProjection en F29Workspace.
// DEVUELVE: el id como string, o null si el cliente no existe en TRIBUTEK.
export async function resolverClienteId(cliente: {
  id: string;
  rut?: string;
}): Promise<string | null> {
  if (/^\d+$/.test(cliente.id)) return cliente.id;
  if (!cliente.rut) return null;
  const res = await authenticatedFetch("/clientes");
  if (!res.ok) throw new Error("no se pudo consultar el directorio de clientes.");
  const remote = await res.json();
  const norm = normalizeRut(cliente.rut);
  const match = Array.isArray(remote)
    ? remote.find(
        (c: { id?: unknown; rut?: unknown }) =>
          typeof c.rut === "string" && normalizeRut(c.rut) === norm,
      )
    : null;
  if (!match || (typeof match.id !== "string" && typeof match.id !== "number")) {
    return null;
  }
  return String(match.id);
}

/** Extrae el mensaje de una respuesta fallida o utiliza el texto alternativo si no hay JSON legible. */
async function mensajeDeError(res: Response, respaldo: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] } | null;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
  } catch {
    /* sin cuerpo legible */
  }
  return `error ${res.status} (${respaldo})`;
}

// QUÉ HACE: PUT /obligaciones/mes/:clienteId con el mes tal como quedó en el
//   ledger local. El backend reemplaza montos y pasos y conserva los abonos.
// DEVUELVE: mensaje de aviso (cliente inexistente) o null si salió bien.
export async function sincronizarMes(
  month: Month,
  cliente: { id: string; name?: string; rut?: string },
): Promise<string | null> {
  const clienteId = await resolverClienteId(cliente);
  if (!clienteId) {
    return (
      `El cliente ${cliente.name ?? "seleccionado"} no existe en TRIBUTEK` +
      (cliente.rut ? ` (RUT ${cliente.rut}).` : ".")
    );
  }
  const res = await authenticatedFetch(`/obligaciones/mes/${clienteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadMes(month)),
  });
  if (!res.ok) throw new Error(await mensajeDeError(res, "no se pudo guardar el mes"));
  return null;
}

// QUÉ HACE: registra un pago nuevo en el backend (POST) y devuelve su id de
//   la BD. Los metadatos de la transferencia (transferId, method, cuentas,
//   destino) y el vínculo con la postergación (deferredId) viajan en el
//   body — son columnas de `abonos_mes`. Lanza en fallo de red/servidor.
export async function crearAbono(
  payment: AppliedPayment,
  clienteId: string,
): Promise<string | null> {
  const [anio, mes] = payment.period.split("-").map(Number);
  const res = await authenticatedFetch(`/obligaciones/abonos/${clienteId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anio,
      mes,
      concept: payment.concept,
      amount: payment.amount,
      date: payment.date,
      note: payment.note,
      transferId: payment.transferId ?? null,
      method: payment.method ?? null,
      originAccount: payment.originAccount ?? null,
      receivingAccount: payment.receivingAccount ?? null,
      destination: payment.destination ?? null,
      deferredId: payment.deferredId ?? null,
    }),
  });
  if (!res.ok)
    throw new Error(await mensajeDeError(res, "no se pudo registrar el abono"));
  const creado = (await res.json()) as { id?: unknown } | null;
  return creado?.id != null ? String(creado.id) : null;
}

// QUÉ HACE: registra en el backend cada pago recién creado (lo llama
//   PaymentForm ANTES del save local) y les pega el id de la BD al objeto
//   local — así el ledger queda con los ids definitivos y el DELETE y el pull
//   los reconocen. Un pago con id numérico ya existe y se salta.
// QUÉ RECIBE: los pagos nuevos del ledger ya calculado y, en una corrección,
//   los pagos que reemplazan (reemplazados) para borrarlos del servidor.
//   Primero borra y después registra: el backend valida saldo por concepto, así
//   que el orden inverso rechazaría el POST por "supera el saldo".
// DEVUELVE: mensaje de aviso o null si todo salió bien. Lanza en fallo de red.
export async function asignarIdsAbonos(
  payments: AppliedPayment[],
  cliente: { id: string; name?: string; rut?: string } | undefined,
  reemplazados: AppliedPayment[] = [],
): Promise<string | null> {
  if (!payments.length && !reemplazados.length) return null;
  if (!cliente) return "Cliente no encontrado en la lista local.";
  const clienteId = await resolverClienteId(cliente);
  if (!clienteId) {
    return (
      `El cliente ${cliente.name ?? "seleccionado"} no existe en TRIBUTEK` +
      (cliente.rut ? ` (RUT ${cliente.rut}).` : ".")
    );
  }
  // Solo reconcilio con el servidor los pagos respaldados (id numérico). Un
  //   pago con id local (UUID) nunca llegó al backend, así que no hay nada que
  //   borrar allá aunque lo reemplace una corrección.
  await borrarAbonos(reemplazados);
  const pendientes = payments.filter((p) => !/^\d+$/.test(p.id));
  for (const payment of pendientes) {
    const id = await crearAbono(payment, clienteId);
    if (id) payment.id = id;
  }
  return null;
}

// QUÉ HACE: borra del backend los pagos que se quitaron del ledger local.
//   Solo toca los que ya tienen id numérico (los UUID nunca llegaron al
//   servidor); un 404 se tolera (ya no estaba). Se llama ANTES del save local:
//   si el DELETE falla, el pago no se quita del ledger y el reintento sigue
//   teniendo su id.
// DEVUELVE: siempre null; lanza en fallo de red.
export async function borrarAbonos(payments: AppliedPayment[]): Promise<null> {
  for (const payment of payments.filter((p) => /^\d+$/.test(p.id))) {
    const res = await authenticatedFetch(`/obligaciones/abonos/${payment.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(await mensajeDeError(res, "no se pudo eliminar el abono"));
    }
  }
  return null;
}

// QUÉ HACE: descarga los meses, abonos y postergaciones de cada cliente del
//   ledger desde el backend (`GET /obligaciones/meses/:clienteId`) y sus
//   facturas desde `GET /facturas/:clienteId`. Cuando el GET de un cliente
//   sale bien, su parte del ledger se REEMPLAZA por lo del servidor (lo
//   local que no está en la BD se descarta — el backend es la fuente de
//   verdad). Si el GET de un cliente falla, ese cliente conserva su parte
//   local tal cual. Los abonos conservan sus metadatos de navegador vía
//   adaptarAbono. Las facturas se hidratan por separado: un fallo de
//   `/facturas` no saca al cliente de `hidratados` ni descarta sus meses,
//   abonos ni postergaciones — solo conserva sus facturas locales.
// DEVUELVE: el ledger actualizado, los ids de los clientes que se
//   hidrataron bien (meses/abonos/postergaciones) y los que hidrataron
//   facturas, o null si ningún cliente hidrató nada.
export async function hidratarObligaciones(
  data: Ledger,
): Promise<{
  ledger: Ledger;
  hidratados: string[];
  facturasHidratados: string[];
} | null> {
  const mesesServidor: Month[] = [];
  const abonosServidor: AppliedPayment[] = [];
  const postergacionesServidor: Deferral[] = [];
  const facturasServidor: Invoice[] = [];
  const hidratados = new Set<string>();
  const facturasHidratados = new Set<string>();
  for (const cliente of data.clients) {
    if (!/^\d+$/.test(cliente.id)) continue;
    let respuesta: {
      months?: MesRemoto[];
      payments?: AbonoRemoto[];
      deferrals?: PostergacionRemota[];
    } | null = null;
    try {
      const res = await authenticatedFetch(`/obligaciones/meses/${cliente.id}`);
      if (res.ok) respuesta = await res.json();
    } catch {
      respuesta = null;
    }
    if (
      !Array.isArray(respuesta?.months) ||
      !Array.isArray(respuesta?.payments) ||
      !Array.isArray(respuesta?.deferrals)
    ) {
      continue;
    }
    hidratados.add(cliente.id);
    for (const r of respuesta.months) mesesServidor.push(adaptarMes(r));
    for (const r of respuesta.payments) {
      abonosServidor.push(adaptarAbono(r, data.payments));
    }
    for (const r of respuesta.deferrals) {
      postergacionesServidor.push(adaptarPostergacion(r));
    }
    // Facturas: endpoint propio. Su fallo (red o 404) solo conserva las
    //   facturas locales del cliente; el resto de su ficha ya se hidrató.
    let filas: FacturaRemota[] | null = null;
    try {
      const res = await authenticatedFetch(`/facturas/${cliente.id}`);
      if (res.ok) filas = await res.json();
    } catch {
      filas = null;
    }
    if (Array.isArray(filas)) {
      facturasHidratados.add(cliente.id);
      for (const r of filas) facturasServidor.push(adaptarFactura(r));
    }
  }
  if (!hidratados.size && !facturasHidratados.size) return null;
  // Fuera del reemplazo quedan las filas de clientes que no se pudieron
  //   hidratar (fallo de red o id local sin espejo en la BD).
  const e = extra(data);
  const months = [
    ...data.months.filter((m) => !hidratados.has(m.clientId)),
    ...mesesServidor,
  ];
  const payments = [
    ...data.payments.filter((p) => !hidratados.has(p.clientId)),
    ...abonosServidor,
  ];
  const deferrals = [
    ...e.deferrals.filter((d) => !hidratados.has(d.clientId)),
    ...postergacionesServidor,
  ];
  const invoices = [
    ...e.invoices.filter((i) => !facturasHidratados.has(i.clientId)),
    ...facturasServidor,
  ];
  return {
    ledger: {
      ...data,
      months,
      payments,
      management: { ...e, deferrals, invoices },
    },
    hidratados: [...hidratados],
    facturasHidratados: [...facturasHidratados],
  };
}

// QUÉ HACE: empuja las postergaciones del ledger al backend después de
//   persistir (opción B). Filas con id local (UUID) → POST; filas con id
//   de la BD cambiadas contra `previas` → PUT; filas de `previas` que ya
//   no están en `locales` → DELETE. Los UUID se reintentan en cada
//   guardado: si un POST falló, la fila conserva su id local y el próximo
//   save la vuelve a empujar. Un DELETE 404 se tolera (ya no estaba).
//   Cuando un POST asigna el id de la BD, también reasigna el
//   `deferredId` de los abonos locales que apuntaban al UUID — si no, el
//   próximo `validateLedger` rechazaría el guardado por abono sin
//   postergación.
// QUÉ RECIBE: las postergaciones del estado nuevo, las del estado previo,
//   los abonos del ledger (para la reasignación) y la lista de clientes
//   para resolver ids de la BD por RUT.
// DEVUELVE: avisos de clientes no resueltos o null si todo salió bien.
//   Lanza en fallo de red/servidor (el Workspace lo atrapa y avisa).
export async function sincronizarPostergaciones(
  locales: Deferral[],
  previas: Deferral[],
  pagos: AppliedPayment[],
  clientes: { id: string; name?: string; rut?: string }[],
): Promise<string | null> {
  const avisos: string[] = [];
  for (const d of locales) {
    const cliente = clientes.find((c) => c.id === d.clientId);
    if (!cliente) {
      avisos.push(`No se encontró el cliente de la postergación ${d.period}.`);
      continue;
    }
    const clienteId = await resolverClienteId(cliente);
    if (!clienteId) {
      avisos.push(
        `El cliente ${cliente.name ?? "seleccionado"} no existe en TRIBUTEK` +
          (cliente.rut ? ` (RUT ${cliente.rut}).` : "."),
      );
      continue;
    }
    if (!/^\d+$/.test(d.id)) {
      const res = await authenticatedFetch(`/obligaciones/postergaciones/${clienteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPostergacion(d)),
      });
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, "no se pudo guardar la postergación"));
      }
      const creada = (await res.json()) as { id?: unknown } | null;
      if (creada?.id != null) {
        const id = String(creada.id);
        for (const p of pagos) {
          if (p.deferredId === d.id) p.deferredId = id;
        }
        d.id = id;
      }
      continue;
    }
    const antes = previas.find((x) => x.id === d.id);
    if (antes && postergacionIgual(antes, d)) continue;
    const res = await authenticatedFetch(`/obligaciones/postergaciones/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadPostergacion(d)),
    });
    if (!res.ok) {
      throw new Error(await mensajeDeError(res, "no se pudo guardar la postergación"));
    }
  }
  for (const d of previas.filter((x) => !locales.some((n) => n.id === x.id))) {
    if (!/^\d+$/.test(d.id)) continue;
    const res = await authenticatedFetch(`/obligaciones/postergaciones/${d.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(await mensajeDeError(res, "no se pudo eliminar la postergación"));
    }
  }
  return avisos.length ? avisos.join(" ") : null;
}

// QUÉ HACE: empuja las facturas del ledger al backend después de persistir
//   (opción B). Mismo criterio de diff que sincronizarPostergaciones: UUID
//   → POST, cambiada → PUT, quitada → DELETE. El PUT lleva `clientId`
//   resuelto: el editor de "otros servicios" permite cambiar la fila de
//   cliente y el backend reasigna la factura.
// QUÉ RECIBE: las facturas del estado nuevo, las del estado previo y la
//   lista de clientes para resolver ids de la BD por RUT.
// DEVUELVE: avisos de clientes no resueltos o null si todo salió bien.
//   Lanza en fallo de red/servidor.
export async function sincronizarFacturas(
  locales: Invoice[],
  previas: Invoice[],
  clientes: { id: string; name?: string; rut?: string }[],
): Promise<string | null> {
  const avisos: string[] = [];
  for (const inv of locales) {
    const cliente = clientes.find((c) => c.id === inv.clientId);
    if (!cliente) {
      avisos.push(`No se encontró el cliente de la factura ${inv.period}.`);
      continue;
    }
    const clienteId = await resolverClienteId(cliente);
    if (!clienteId) {
      avisos.push(
        `El cliente ${cliente.name ?? "seleccionado"} no existe en TRIBUTEK` +
          (cliente.rut ? ` (RUT ${cliente.rut}).` : "."),
      );
      continue;
    }
    if (!/^\d+$/.test(inv.id)) {
      const res = await authenticatedFetch(`/facturas/${clienteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFactura(inv)),
      });
      if (!res.ok) {
        throw new Error(await mensajeDeError(res, "no se pudo guardar la factura"));
      }
      const creada = (await res.json()) as { id?: unknown } | null;
      if (creada?.id != null) inv.id = String(creada.id);
      continue;
    }
    const antes = previas.find((x) => x.id === inv.id);
    if (antes && antes.clientId === inv.clientId && facturaIgual(antes, inv)) {
      continue;
    }
    const res = await authenticatedFetch(`/facturas/${inv.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clienteId, ...payloadFactura(inv) }),
    });
    if (!res.ok) {
      throw new Error(await mensajeDeError(res, "no se pudo guardar la factura"));
    }
  }
  for (const inv of previas.filter((x) => !locales.some((n) => n.id === x.id))) {
    if (!/^\d+$/.test(inv.id)) continue;
    const res = await authenticatedFetch(`/facturas/${inv.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(await mensajeDeError(res, "no se pudo eliminar la factura"));
    }
  }
  return avisos.length ? avisos.join(" ") : null;
}
