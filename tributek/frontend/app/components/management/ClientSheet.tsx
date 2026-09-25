"use client";
import { useState, type FormEvent } from "react";
import { concepts, services, money, today, type Client } from "../ficha/model";
import {
  allocatePayment,
  balance,
  extra,
  getMonth,
  periodLabel,
  postpone,
  reportRows,
  suggestedDue,
  totals,
  updateMonth,
  type Concept,
  type Ledger,
  type PaymentInput,
} from "./model";
import { Badge, Field, Modal, Money, copyReportImage, printReport } from "./ui";

export type ClientView = Client & {
  rut: string;
  machine: string;
  fee: number;
  active: boolean;
};
export type Save = (next: Ledger, revision: string) => void;
export function PaymentForm({
  data,
  clientId,
  period,
  save,
  onClose,
  deferredId,
  editingKey,
}: {
  data: Ledger;
  clientId: string;
  period: string;
  save: Save;
  onClose: () => void;
  deferredId?: string;
  editingKey?: string;
}) {
  const previous = data.payments.filter(
    (p) => editingKey && (p.transferId || p.id) === editingKey,
  );
  const first = previous[0];
  const targetDeferred = deferredId || first?.deferredId;
  const [error, setError] = useState("");
  const [method, setMethod] = useState(first?.method || "Transferencia");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const input: PaymentInput = {
        clientId,
        through: period,
        concept: (f.get("concept") || "Todos") as PaymentInput["concept"],
        amount: Number(f.get("amount")),
        date: String(f.get("date")),
        note: String(f.get("note")),
        method,
        destination: f.get("destination") as PaymentInput["destination"],
        deferredId: targetDeferred,
      };
      const base = editingKey
        ? {
            ...data,
            payments: data.payments.filter(
              (p) => (p.transferId || p.id) !== editingKey,
            ),
          }
        : data;
      const next = allocatePayment(base, input);
      save(next, data.revision);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar el pago.",
      );
    }
  }
  return (
    <form onSubmit={submit} className="tk-stack">
      {error && (
        <p role="alert" className="tk-error">
          {error}
        </p>
      )}
      <div className="tk-grid">
        <Field label="Monto">
          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            defaultValue={
              first ? previous.reduce((s, p) => s + p.amount, 0) : undefined
            }
            required
          />
        </Field>
        <Field label="Fecha del pago">
          <input
            name="date"
            type="date"
            defaultValue={first?.date || today()}
            max={today()}
            required
          />
        </Field>
      </div>
      {!targetDeferred && (
        <Field label="Aplicar a">
          <select
            name="concept"
            defaultValue={
              previous.length &&
              previous.every((p) => p.concept === first.concept)
                ? first.concept
                : "Todos"
            }
          >
            <option value="Todos">Pago todo · deuda más antigua primero</option>
            {concepts.filter((c) => c !== "Postergación" || data.months.some((m) => m.clientId === clientId && m.period <= period && m.amounts.Postergación > 0)).map((c) => (
              <option key={c} value={c}>{c === "Postergación" ? "Postergación anterior" : c}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="tk-grid">
        <Field label="Método">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Transferencia</option>
            <option>Efectivo</option>
            <option>Otro</option>
          </select>
        </Field>
        <Field label="Destino del pago">
          <select
            name="destination"
            defaultValue={first?.destination || "tributek"}
          >
            <option value="tributek">Recibido por TRIBUTEK</option>
            <option value="institution">
              Pagado directamente a institución
            </option>
          </select>
        </Field>
      </div>
      <Field
        label={
          "Glosa / referencia (opcional)"
        }
      >
        <input
          name="note"
          defaultValue={first?.note || ""}
          maxLength={300}
          placeholder="Referencia que identifica el pago"
        />
      </Field>
      <p className="tk-subtle">
        Se aplicará hasta {periodLabel(period)}. Las postergaciones se abonan
        desde su propia vista.
      </p>
      <footer>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary">Guardar pago</button>
      </footer>
    </form>
  );
}
export default function ClientSheet({
  data,
  client,
  period,
  accumulated,
  save,
  onClose,
  hidden,
}: {
  data: Ledger;
  client: ClientView;
  period: string;
  accumulated: boolean;
  save: Save;
  onClose: () => void;
  hidden: boolean;
}) {
  const existing = getMonth(data, client.id, period);
  const [draft, setDraft] = useState(() =>
    data.months.includes(existing)
      ? existing
      : {
          ...existing,
          amounts: { ...existing.amounts, Honorarios: client.fee },
        },
  );
  const initialProfile = {
    commune: extra(data).profiles[client.id]?.commune || "",
    taxRegime: extra(data).profiles[client.id]?.taxRegime || "",
    startedAt: extra(data).profiles[client.id]?.startedAt || "",
  };
  const [profile, setProfile] = useState({
    ...initialProfile,
    rut: client.rut,
    machine: client.machine,
    fee: client.fee,
    active: client.active,
  });
  const [note, setNote] = useState(client.note);
  const [tab, setTab] = useState("Conceptos");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [postponeConcept, setPostponeConcept] = useState<Concept>("Impuestos");
  const [includePostponed, setIncludePostponed] = useState(false);
  const rows = reportRows(data, client.id, period, accumulated);
  const reportTotal = rows.reduce((s, r) => s + r.amount, 0);
  const current = totals(data, existing);
  const deferrals = extra(data).deferrals.filter(
    (d) => d.clientId === client.id,
  );
  const title = accumulated
    ? "Cobros pendientes acumulados"
    : "Obligación mensual";
  const text = `Buen día.\n\n${title} · ${client.name}\n${periodLabel(period)}\n\n${rows.map((r) => `${periodLabel(r.period)} · ${r.concept}: ${money(r.amount)}`).join("\n") || "Sin saldos pendientes."}\n\nTotal pendiente: ${money(reportTotal)}${includePostponed && deferrals.length ? `\n\nPostergaciones (informativo):\n${deferrals.map((d) => `${d.concept} · ${d.period} · vence ${d.due}`).join("\n")}` : ""}\n\nSi ya realizó el pago, envíenos el comprobante. Muchas gracias.`;
  function close() {
    if (!dirty || window.confirm("Hay cambios sin guardar. ¿Descartarlos?"))
      onClose();
  }
  function changeTab(t: string) {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?"))
      return;
    setDraft(existing);
    setProfile({
      ...initialProfile,
      rut: client.rut,
      machine: client.machine,
      fee: client.fee,
      active: client.active,
    });
    setNote(client.note);
    setDirty(false);
    setError("");
    setTab(t);
  }
  function persistMonth() {
    try {
      save(updateMonth(data, draft), data.revision);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Mensaje copiado.");
    } catch {
      setError("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  }
  function defer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      save(
        postpone(data, {
          id: crypto.randomUUID(),
          clientId: client.id,
          period,
          concept: postponeConcept,
          amount: Number(f.get("amount")),
          due: String(f.get("due")),
          note: String(f.get("note")),
        }),
        data.revision,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={client.name} onClose={close} wide>
      <div className="tk-dialog-body">
        <div className="tk-header">
          <p className="tk-subtle">
            {client.rut || "RUT sin registrar"} · {periodLabel(period)}
          </p>
          <Badge>{current.status}</Badge>
        </div>
        <div
          className="tk-tabs"
          role="group"
          aria-label="Secciones de la ficha"
        >
          {["Conceptos", "Abonar", "Mensaje", "Postergar", "Datos"].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => changeTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="tk-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="tk-success">
            {notice}
          </p>
        )}
        {tab === "Conceptos" && (
          <>
            <div className="tk-grid">
              <div>
                {concepts.filter((c) => c !== "Postergación").map((c) => (
                  <label key={c} className="tk-line">
                    <span>{c}</span>
                    <input
                      aria-label={c}
                      type="number"
                      min="0"
                      step="1"
                      value={draft.amounts[c] || ""}
                      onChange={(e) => {
                        setDirty(true);
                        setDraft({
                          ...draft,
                          amounts: {
                            ...draft.amounts,
                            [c]: Number(e.target.value),
                          },
                        });
                      }}
                    />
                  </label>
                ))}
                {existing.amounts.Postergación > 0 && (
                  <details className="tk-panel">
                    <summary>Postergación anterior · conservar historial</summary>
                    <p>Monto original: <Money value={existing.amounts.Postergación} hidden={hidden} />. Saldo pendiente: <Money value={balance(data, existing, "Postergación")} hidden={hidden} />.</p>
                    <p>Este registro anterior mantiene sus abonos. Para asignar un vencimiento al saldo, usa Postergar y selecciona Postergación anterior.</p>
                  </details>
                )}
              </div>
              <div className="tk-stack">
                <section className="tk-panel tk-report">
                  <h3>Resumen del período guardado</h3>
                  <div className="tk-line">
                    <span>Total exigible</span>
                    <Money value={current.total} hidden={hidden} />
                  </div>
                  <div className="tk-line">
                    <span>Cancelado</span>
                    <Money value={current.received} hidden={hidden} />
                  </div>
                  <div className="tk-line">
                    <span>Pendiente</span>
                    <Money value={current.pending} hidden={hidden} />
                  </div>
                </section>
                <label className="tk-actions">
                  <input
                    type="checkbox"
                    checked={draft.sent}
                    onChange={(e) => {
                      setDirty(true);
                      setDraft({ ...draft, sent: e.target.checked });
                    }}
                  />
                  Detalle informado al cliente
                </label>
                <details className="tk-details">
                  <summary>Trabajo y próximo contacto</summary>
                  <div className="tk-stack">
                    {draft.steps.map((s, i) => (
                      <label key={s.id} className="tk-actions">
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={(e) => {
                            setDirty(true);
                            setDraft({
                              ...draft,
                              steps: draft.steps.map((x, j) =>
                                j === i ? { ...x, done: e.target.checked } : x,
                              ),
                            });
                          }}
                        />
                        {s.text}
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const text = window.prompt("Nombre de la tarea");
                        if (text?.trim()) {
                          setDirty(true);
                          setDraft({
                            ...draft,
                            steps: [
                              ...draft.steps,
                              {
                                id: crypto.randomUUID(),
                                text: text.trim(),
                                done: false,
                              },
                            ],
                          });
                        }
                      }}
                    >
                      Agregar tarea
                    </button>
                    <Field label="Próximo contacto">
                      <input
                        type="date"
                        value={draft.followDate}
                        onChange={(e) => {
                          setDirty(true);
                          setDraft({
                            ...draft,
                            followDate: e.target.value,
                            followDone: false,
                          });
                        }}
                      />
                    </Field>
                    <Field label="Motivo">
                      <input
                        value={draft.followNote}
                        maxLength={500}
                        onChange={(e) => {
                          setDirty(true);
                          setDraft({ ...draft, followNote: e.target.value });
                        }}
                      />
                    </Field>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.followDone}
                        onChange={(e) => {
                          setDirty(true);
                          setDraft({ ...draft, followDone: e.target.checked });
                        }}
                      />{" "}
                      Contacto realizado
                    </label>
                  </div>
                </details>
                <a
                  className="tk-button"
                  href={`/admin/pagos?cliente=${encodeURIComponent(client.id)}`}
                >
                  Historial de pagos
                </a>
              </div>
            </div>
            <footer>
              <button onClick={close}>Cancelar</button>
              <button className="primary" onClick={persistMonth}>
                Guardar conceptos
              </button>
            </footer>
          </>
        )}
        {tab === "Abonar" && (
          <PaymentForm
            data={data}
            clientId={client.id}
            period={period}
            save={save}
            onClose={onClose}
          />
        )}
        {tab === "Mensaje" && (
          <div className="tk-stack">
            <h3>{title}</h3>
            <textarea
              aria-label="Mensaje al cliente"
              rows={12}
              readOnly
              value={
                hidden
                  ? "Activa Mostrar montos para revisar y compartir el detalle."
                  : text
              }
            />
            <label className="tk-actions">
              <input
                type="checkbox"
                checked={includePostponed}
                onChange={(e) => setIncludePostponed(e.target.checked)}
              />
              Mencionar postergaciones solo en el texto
            </label>
            <div className="tk-actions">
              <button disabled={hidden} onClick={copyText}>
                Copiar mensaje
              </button>
              <button
                disabled={hidden}
                onClick={async () => {
                  try {
                    setNotice(
                      await copyReportImage(
                        title,
                        `${client.name} · ${client.rut} · ${periodLabel(period)}`,
                        rows.map((r) => ({
                          label: `${r.period} · ${r.concept}`,
                          amount: r.amount,
                        })),
                        reportTotal,
                      ),
                    );
                  } catch {
                    setError(
                      "No se pudo copiar la imagen. Revisa el permiso del portapapeles.",
                    );
                  }
                }}
              >
                Copiar imagen
              </button>
              <button
                disabled={hidden}
                onClick={() => {
                  try {
                    printReport(
                      title,
                      `${client.name} · ${client.rut} · ${periodLabel(period)}`,
                      rows.map((r) => ({
                        label: `${r.period} · ${r.concept}`,
                        amount: r.amount,
                      })),
                      reportTotal,
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                PDF / Imprimir
              </button>
              {client.phone.replace(/\D/g, "").length >= 9 && (
                <a
                  className="tk-button"
                  aria-disabled={hidden}
                  href={
                    hidden
                      ? undefined
                      : `https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>
            <p className="tk-subtle">
              El envío se confirma manualmente en Conceptos.
            </p>
          </div>
        )}
        {tab === "Postergar" && (
          <form onSubmit={defer} className="tk-stack">
            <Field label="Concepto de origen">
              <select
                value={postponeConcept}
                onChange={(e) => setPostponeConcept(e.target.value as Concept)}
              >
                {concepts
                  .filter((c) => !services.includes(c) && (c !== "Postergación" || balance(data, existing, c) > 0))
                  .map((c) => (
                    <option key={c} value={c}>{c === "Postergación" ? "Postergación anterior" : c}</option>
                  ))}
              </select>
            </Field>
            <div className="tk-grid">
              <Field label="Monto a postergar">
                <input
                  name="amount"
                  type="number"
                  required
                  min="1"
                  max={balance(data, existing, postponeConcept)}
                />
              </Field>
              <Field label="Nuevo vencimiento">
                <input
                  name="due"
                  type="date"
                  required
                  defaultValue={suggestedDue(period)}
                />
              </Field>
            </div>
            <Field label="Observación">
              <textarea name="note" maxLength={500} />
            </Field>
            <p className="tk-subtle">
              Confirma la fecha acordada. El monto saldrá del saldo exigible y
              conservará su origen en Postergaciones.
            </p>
            <footer>
              <button className="primary">Guardar postergación</button>
            </footer>
          </form>
        )}
        {tab === "Datos" && (
          <form
            className="tk-stack"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                save(
                  {
                    ...data,
                    clients: data.clients.map((c) =>
                      c.id === client.id ? { ...c, note } : c,
                    ),
                    management: {
                      ...extra(data),
                      profiles: {
                        ...extra(data).profiles,
                        [client.id]: profile,
                      },
                    },
                  },
                  data.revision,
                );
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="Máquina de pago">
              <input
                value={profile.machine}
                maxLength={80}
                onChange={(e) => {
                  setDirty(true);
                  setProfile({ ...profile, machine: e.target.value });
                }}
              />
            </Field>
            <Field label="Honorario mensual acordado">
              <input
                type="number"
                min="0"
                step="1"
                value={profile.fee}
                onChange={(e) => {
                  setDirty(true);
                  setProfile({ ...profile, fee: Number(e.target.value) });
                }}
              />
            </Field>
            <div className="tk-grid">
              <Field label="Comuna">
                <input
                  value={profile.commune}
                  maxLength={100}
                  onChange={(e) => {
                    setDirty(true);
                    setProfile({ ...profile, commune: e.target.value });
                  }}
                />
              </Field>
              <Field label="Régimen tributario">
                <input
                  value={profile.taxRegime}
                  maxLength={150}
                  onChange={(e) => {
                    setDirty(true);
                    setProfile({ ...profile, taxRegime: e.target.value });
                  }}
                />
              </Field>
              <Field label="Fecha de inicio">
                <input
                  type="date"
                  value={profile.startedAt}
                  onChange={(e) => {
                    setDirty(true);
                    setProfile({ ...profile, startedAt: e.target.value });
                  }}
                />
              </Field>
            </div>
            <Field label="Nota privada">
              <textarea
                value={note}
                maxLength={1000}
                onChange={(e) => {
                  setDirty(true);
                  setNote(e.target.value);
                }}
              />
            </Field>
            <p className="tk-subtle">
              La nota privada no se incluye en mensajes ni imágenes.
            </p>
            <footer>
              <button className="primary">Guardar datos de gestión</button>
            </footer>
          </form>
        )}
      </div>
    </Modal>
  );
}
