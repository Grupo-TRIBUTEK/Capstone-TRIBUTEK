"use client";
import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import { authenticatedFetch } from "../../features/auth/auth-client";
import { Modal, Field, downloadBlob } from "./ui";
import { money } from "../ficha/model";
export type PaymentFolder = {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  files: {
    id: string;
    name: string;
    method: string;
    origin: string;
    destination: string;
    amount: number | null;
    createdAt: string;
  }[];
};
async function response<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new Error(body?.message || "No se pudo conectar con los respaldos.");
  }
  return r.json();
}
export async function registerFolder(
  clientId: string,
  id: string,
  date: string,
  amount: number,
) {
  return response<PaymentFolder>(
    await authenticatedFetch(`/payment-evidence/${clientId}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount }),
    }),
  );
}
export function PaymentFilesButton({
  clientId,
  id,
  date,
  amount,
  origin = "",
  destination = "",
  hidden = false,
}: {
  clientId: string;
  id: string;
  date: string;
  amount: number;
  origin?: string;
  destination?: string;
  hidden?: boolean;
}) {
  const [folder, setFolder] = useState<PaymentFolder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={busy || hidden}
        title="Ver y agregar comprobantes de este pago"
        aria-label={busy ? "Abriendo comprobantes" : "Ver comprobantes del pago"}
        aria-busy={busy}
        style={{ width: 44, height: 44, padding: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setFolder(await registerFolder(clientId, id, date, amount));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Icon name="folder" />
      </button>
      {error && <p role="alert">{error}</p>}
      {folder && (
        <PaymentFiles
          folder={folder}
          origin={origin}
          destination={destination}
          close={() => setFolder(null)}
        />
      )}
    </>
  );
}
export function PaymentFiles({
  folder: initial,
  close,
  origin = "",
  destination = "",
}: {
  folder: PaymentFolder;
  close: () => void;
  origin?: string;
  destination?: string;
}) {
  const [folder, setFolder] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("Transferencia");
  const [notice, setNotice] = useState("");
  const base = `/payment-evidence/${folder.clientId}/${folder.id}`;
  return (
    <Modal title="Comprobantes del pago" onClose={close} wide>
      <div className="tk-stack" style={{ padding: 24 }}>
        <p>
          {folder.date} · Pago registrado:{" "}
          <strong>{money(folder.amount)}</strong>
        </p>
        {error && (
          <p className="tk-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <form
          className="tk-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const files = data.getAll("files") as File[];
            if (
              files.length > 10 ||
              files.reduce((sum, f) => sum + f.size, 0) > 8 * 1024 * 1024 ||
              files.some((f) => !f.size || f.size > 8 * 1024 * 1024)
            ) {
              setError(
                "Selecciona hasta 10 archivos, con un máximo de 8 MB en total.",
              );
              return;
            }
            setBusy(true);
            setError("");
            setNotice("");
            try {
              setFolder(
                await response<PaymentFolder>(
                  await authenticatedFetch(`${base}/files`, {
                    method: "POST",
                    body: data,
                  }),
                ),
              );
              form.reset();
              setMethod("Transferencia");
              setNotice("Comprobantes guardados.");
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="tk-grid">
            <Field label="Método del pago respaldado">
              <select
                name="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {["Transferencia", "Efectivo", "Tarjeta", "Otro"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Monto respaldado (opcional)">
              <input
                name="amount"
                type="number"
                min="1"
                max={folder.amount}
                step="1"
              />
            </Field>
          </div>
          {method !== "Efectivo" && (
            <div className="tk-grid">
              <Field label="Cuenta de origen (opcional)">
                <input
                  name="origin"
                  defaultValue={origin}
                  maxLength={200}
                  placeholder="Banco, titular y cuenta"
                />
              </Field>
              <Field label="Cuenta receptora (opcional)">
                <input
                  name="destination"
                  defaultValue={destination}
                  maxLength={200}
                  placeholder="Banco, titular y cuenta"
                />
              </Field>
            </div>
          )}
          <Field label="Archivos PDF, PNG o JPG · hasta 8 MB en total por envío">
            <input
              name="files"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              multiple
              required
            />
          </Field>
          <p className="tk-subtle">
            Puedes agregar varios archivos. Si corresponden a distintos métodos
            o cuentas, súbelos por separado con sus respectivos datos.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Agregar comprobantes"}
          </button>
        </form>
        {!folder.files.length && <p>No hay comprobantes adjuntos.</p>}
        <ul className="tk-stack" style={{ listStyle: "none", padding: 0 }}>
          {folder.files.map((f) => (
            <li key={f.id} className="tk-card" style={{ padding: 16 }}>
              <strong>{f.name}</strong>
              <p>
                {f.method}
                {f.amount !== null && ` · ${money(f.amount)}`}
              </p>
              {f.origin && <p>Origen: {f.origin}</p>}
              {f.destination && <p>Receptora: {f.destination}</p>}
              <div className="tk-actions">
                <button
                  disabled={busy}
                  onClick={async () => {
                    setError("");
                    try {
                      const r = await authenticatedFetch(
                        `${base}/files/${f.id}`,
                      );
                      if (!r.ok)
                        throw new Error("No se pudo descargar el comprobante.");
                      downloadBlob(await r.blob(), f.name);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Descargar
                </button>
                <button
                  disabled={busy}
                  className="danger"
                  onClick={async () => {
                    if (
                      !confirm(
                        "¿Quitar este comprobante? El monto del pago no cambiará.",
                      )
                    )
                      return;
                    setBusy(true);
                    setError("");
                    try {
                      setFolder(
                        await response<PaymentFolder>(
                          await authenticatedFetch(`${base}/files/${f.id}`, {
                            method: "DELETE",
                          }),
                        ),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
export function ClientPaymentFiles({
  clients,
}: {
  clients: { id: string; nombreRazonSocial: string }[];
}) {
  const [folders, setFolders] = useState<PaymentFolder[]>([]);
  const [selected, setSelected] = useState<PaymentFolder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all(
      clients.map((c) =>
        authenticatedFetch(`/payment-evidence/${c.id}`).then(
          response<PaymentFolder[]>,
        ),
      ),
    )
      .then((rows) => {
        if (active) setFolders(rows.flat());
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clients]);
  return (
    <section className="tk tk-card" style={{ marginTop: 24, padding: 24 }}>
      <h2>Comprobantes de pagos</h2>
      {loading && <p>Cargando…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !folders.length && (
        <p>Aún no hay carpetas de pagos disponibles.</p>
      )}
      <div className="tk-stack">
        {folders.map((f) => (
          <div key={`${f.clientId}/${f.id}`} className="tk-actions">
            <span>
              {clients.find((c) => c.id === f.clientId)?.nombreRazonSocial} ·{" "}
              {f.date} · {money(f.amount)}
            </span>
            <button
              type="button"
              title="Ver comprobantes del pago"
              aria-label={`Ver comprobantes del pago del ${f.date}`}
              style={{ width: 44, height: 44, padding: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              onClick={async () => {
                try {
                  setSelected(
                    await response<PaymentFolder>(
                      await authenticatedFetch(
                        `/payment-evidence/${f.clientId}/${f.id}`,
                      ),
                    ),
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Icon name="folder" />
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <PaymentFiles folder={selected} close={() => setSelected(null)} />
      )}
    </section>
  );
}
