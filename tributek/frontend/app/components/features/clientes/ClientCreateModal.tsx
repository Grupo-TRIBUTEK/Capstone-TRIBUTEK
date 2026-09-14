"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/app/features/auth/auth-client";

export type ClientRecord = {
  id: string;
  tipoCliente: string;
  rut: string;
  nombreRazonSocial: string;
  contactoPrincipal?: string;
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  estado: string;
};

type ClientForm = Omit<ClientRecord, "id">;

const emptyForm: ClientForm = {
  tipoCliente: "Empresa",
  rut: "",
  nombreRazonSocial: "",
  contactoPrincipal: "",
  emailContacto: "",
  telefono: "",
  direccion: "",
  estado: "Activo",
};

type ClientCreateModalProps = {
  onClose: () => void;
  onSaved: (client: ClientRecord) => void;
  client?: ClientRecord;
};

export default function ClientCreateModal({
  onClose,
  onSaved,
  client,
}: ClientCreateModalProps) {
  const [form, setForm] = useState<ClientForm>(client ?? emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  const hasEnteredData = Object.values(form).some(
    (value, index) => value !== Object.values(emptyForm)[index],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  function requestClose() {
    if (hasEnteredData && !isSubmitting) {
      setShowDiscardConfirmation(true);
      return;
    }

    onClose();
  }

  function updateField(field: keyof ClientForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(
        client ? `/clientes/${client.id}` : "/clientes",
        {
        method: client ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        throw new Error(
          client ? "No fue posible actualizar el cliente." : "No fue posible crear el cliente.",
        );
      }

      const responseClient = (await response.json()) as Partial<ClientRecord>;
      onSaved({ ...form, ...responseClient, id: String(responseClient.id ?? client?.id ?? Date.now()) });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ocurrió un error al crear el cliente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        aria-labelledby="new-client-title"
        aria-modal="true"
        className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-4rem)]"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <h2 id="new-client-title" className="text-xl font-bold text-[#252f46]">
              {client ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {client ? "Actualiza los datos del cliente en TRIBUTEK." : "Registra un nuevo cliente en TRIBUTEK."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={requestClose}
            className="rounded-lg p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-[#252f46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252f46]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8">
            <Field label="Tipo de cliente" required>
              <select
                value={form.tipoCliente}
                onChange={(event) => updateField("tipoCliente", event.target.value)}
                className={inputClassName}
                required
              >
                <option>Empresa</option>
                <option>Persona</option>
              </select>
            </Field>
            <Field label="RUT" required>
              <input value={form.rut} onChange={(event) => updateField("rut", event.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Nombre / Razón social" required className="sm:col-span-2">
              <input value={form.nombreRazonSocial} onChange={(event) => updateField("nombreRazonSocial", event.target.value)} className={inputClassName} required />
            </Field>
            <Field label="Contacto principal">
              <input value={form.contactoPrincipal} onChange={(event) => updateField("contactoPrincipal", event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Email de contacto">
              <input type="email" value={form.emailContacto} onChange={(event) => updateField("emailContacto", event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Teléfono">
              <input value={form.telefono} onChange={(event) => updateField("telefono", event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Dirección">
              <input value={form.direccion} onChange={(event) => updateField("direccion", event.target.value)} className={inputClassName} />
            </Field>
            <Field label="Estado" required>
              <select value={form.estado} onChange={(event) => updateField("estado", event.target.value)} className={inputClassName} required>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Pendiente</option>
              </select>
            </Field>
            {error && <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <button type="button" onClick={requestClose} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-[#252f46] hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#252f46] px-5 py-3 text-sm font-semibold text-white hover:bg-[#344463] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting
                ? client ? "Guardando cambios..." : "Creando cliente..."
                : client ? "Guardar cambios" : "Crear cliente"}
            </button>
          </footer>
        </form>
      </section>

      {showDiscardConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="discard-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 id="discard-title" className="text-lg font-bold text-[#252f46]">¿Deseas salir?</h3>
            <p className="mt-2 text-sm text-slate-600">Los datos ingresados se perderán.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDiscardConfirmation(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#252f46]">Continuar editando</button>
              <button type="button" onClick={onClose} className="rounded-lg bg-[#252f46] px-4 py-2.5 text-sm font-semibold text-white">Salir</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const inputClassName = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#252f46] outline-none focus:border-[#252f46] focus:ring-2 focus:ring-[#252f46]";

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-sm font-medium text-[#252f46] ${className}`}>
      <span>{label}{required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}