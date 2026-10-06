"use client";
import { useEffect, useState, type FormEvent } from "react";
import { authenticatedFetch } from "../../features/auth/auth-client";
import { processSteps, stepStates, type Process, type ProcessStep } from "./model";
import { type ClientView } from "./ClientSheet";
import { Field, Modal, downloadBlob } from "./ui";

type Document = { id: string; nombreArchivo: string };
export default function Formalization({
  client,
  period,
  onSaved,
  onClose,
}: {
  client: ClientView;
  period: string;
  onSaved?: () => void;
  onClose: () => void;
}) {
  // El checklist vive en el backend (fuente de verdad desde Fase 2); el estado
  // local arranca en "Pendiente" y lo sobreescribe el GET de abajo si ya existe proceso.
  const [draft, setDraft] = useState<Process>(() => ({
    clientId: client.id,
    steps: processSteps.map((name) => ({
      name,
      state: "Pendiente",
      date: "",
    })),
    note: "",
  }));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    // Checklist desde el backend (fuente de verdad desde Fase 2).
    authenticatedFetch(
      `/gestiones/formalizacion/${encodeURIComponent(client.id)}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudo cargar el checklist.");
        const body = (await r.json()) as {
          steps?: { name: string; state: string; date: string }[];
          note?: string;
        };
        if (controller.signal.aborted) return;
        // steps vacío = sin proceso: conservamos los 11 en "Pendiente".
        if (Array.isArray(body.steps) && body.steps.length) {
          // El backend garantiza los 4 estados válidos; si llega otro, es un
          // fallo de contrato y lo avisamos en lugar de romper el select.
          const steps = body.steps.map((s): ProcessStep => {
            if (!(stepStates as readonly string[]).includes(s.state)) {
              throw new Error(`Estado inválido en el checklist: "${s.state}".`);
            }
            return { name: s.name, state: s.state as ProcessStep["state"], date: s.date };
          });
          setDraft({
            clientId: client.id,
            steps,
            note: body.note ?? "",
          });
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    authenticatedFetch(
      `/documentos?clienteId=${encodeURIComponent(client.id)}&periodo=${period}&tipo=Formalización`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los respaldos.");
        const rows = await r.json();
        if (!Array.isArray(rows))
          throw new Error("Respuesta de documentos inválida.");
        if (!controller.signal.aborted) setDocuments(rows);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [client.id, period]);
  function close() {
    if (!dirty || confirm("¿Descartar los cambios del checklist sin guardar?"))
      onClose();
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("clienteId", client.id);
    body.set("periodo", period);
    body.set("tipo", "Formalización");
    body.set("estado", "RECIBIDO");
    setBusy(true);
    setError("");
    try {
      const r = await authenticatedFetch("/documentos", {
        method: "POST",
        body,
      });
      if (!r.ok)
        throw new Error(
          "No se pudo subir el respaldo. Revisa el archivo y la conexión.",
        );
      const doc = await r.json();
      setDocuments((prev) => [doc, ...prev]);
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Formalización · ${client.name}`} onClose={close} wide>
      <div className="tk-dialog-body tk-stack">
        {error && (
          <p role="alert" className="tk-error">
            {error}
          </p>
        )}
        <div className="tk-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trámite</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {draft.steps.map((step, index) => (
                <tr key={step.name}>
                  <td>{step.name}</td>
                  <td>
                    <select
                      aria-label={`Estado de ${step.name}`}
                      value={step.state}
                      onChange={(e) => {
                        setDirty(true);
                        setDraft({
                          ...draft,
                          steps: draft.steps.map((s, i) =>
                            i === index
                              ? {
                                  ...s,
                                  state: e.target.value as typeof step.state,
                                }
                              : s,
                          ),
                        });
                      }}
                    >
                      {stepStates.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={`Fecha de ${step.name}`}
                      type="date"
                      value={step.date}
                      onChange={(e) => {
                        setDirty(true);
                        setDraft({
                          ...draft,
                          steps: draft.steps.map((s, i) =>
                            i === index ? { ...s, date: e.target.value } : s,
                          ),
                        });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Field label="Observaciones">
          <textarea
            maxLength={1000}
            value={draft.note}
            onChange={(e) => {
              setDirty(true);
              setDraft({ ...draft, note: e.target.value });
            }}
          />
        </Field>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              // Reemplazo total en el backend: PUT {steps, note} → cabecera + 11 pasos.
              const r = await authenticatedFetch(
                `/gestiones/formalizacion/${encodeURIComponent(client.id)}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    steps: draft.steps,
                    note: draft.note,
                  }),
                },
              );
              if (!r.ok) {
                const body = (await r.json().catch(() => null)) as {
                  message?: string | string[];
                } | null;
                const message = Array.isArray(body?.message)
                  ? body.message.join(" ")
                  : body?.message;
                throw new Error(
                  message || `No se pudo guardar el checklist (HTTP ${r.status}).`,
                );
              }
              const saved = (await r.json()) as {
                steps: Process["steps"];
                note: string;
              };
              setDraft({
                clientId: client.id,
                steps: saved.steps,
                note: saved.note,
              });
              setDirty(false);
              onSaved?.();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Guardando…" : "Guardar checklist"}
        </button>
        <section className="tk-panel">
          <h3>Respaldos · {period}</h3>
          <form onSubmit={upload} className="tk-stack">
            <Field label="Archivo (máximo 10 MB)">
              <input
                name="archivo"
                type="file"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.setCustomValidity(
                    f && f.size > 10 * 1024 * 1024
                      ? "El archivo supera 10 MB."
                      : "",
                  );
                }}
              />
            </Field>
            <Field label="Trámite asociado">
              <select name="observacion">
                {draft.steps.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </select>
            </Field>
            <button disabled={busy}>
              {busy ? "Subiendo…" : "Subir respaldo"}
            </button>
          </form>
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>
                <button
                  onClick={async () => {
                    try {
                      const r = await authenticatedFetch(
                        `/documentos/${encodeURIComponent(doc.id)}/descargar`,
                      );
                      if (!r.ok)
                        throw new Error("No se pudo descargar el respaldo.");
                      downloadBlob(await r.blob(), doc.nombreArchivo);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {doc.nombreArchivo}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
