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
type PortalAccess = { tieneAcceso: boolean; nombreUsuario?: string; activo?: boolean; activationUrl?: string };

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
  const [crearAccesoPortal, setCrearAccesoPortal] = useState(false);
  const [revocarAccesoPortal, setRevocarAccesoPortal] = useState(false);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [activationUrl, setActivationUrl] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [portalClientId, setPortalClientId] = useState(client?.id ?? "");
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [generandoEnlace, setGenerandoEnlace] = useState(false);
  const [modificarUsuario, setModificarUsuario] = useState(false);

  const hasEnteredData = Object.values(form).some(
    (value, index) => value !== Object.values(emptyForm)[index],
  ) || crearAccesoPortal || revocarAccesoPortal || Boolean(nombreUsuario);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    authenticatedFetch(`/clientes/${client.id}/acceso-portal`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo consultar el acceso del portal.");
        return (await response.json()) as PortalAccess;
      })
      .then((access) => {
        if (cancelled) return;
        setPortalAccess(access);
        setNombreUsuario(access.nombreUsuario ?? "");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Error al consultar el acceso.");
      });
    return () => { cancelled = true; };
  }, [client]);

  function requestClose() {
    if (activationUrl) {
      onClose();
      return;
    }
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

  function updateNombreUsuario(value: string) {
    setNombreUsuario(value);
    setError("");
  }

  async function copyInvitation(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
    } catch {
      setError("No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.");
    }
  }

  async function generatePortalLink(kind: "invite" | "reset") {
    const clientId = client?.id ?? portalClientId;
    if (!clientId) return;
    setGenerandoEnlace(true);
    setError("");
    setLinkCopiado(false);
    try {
      const action = kind === "invite" ? "enlace" : "restablecimiento";
      const response = await authenticatedFetch(`/clientes/${clientId}/acceso-portal/${action}`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { activationUrl?: string; resetUrl?: string; message?: string | string[] } | null;
      if (!response.ok) {
        const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
        throw new Error(message || "No se pudo generar el enlace.");
      }
      if (kind === "invite" && data?.activationUrl) {
        if (client) setPortalAccess((current) => current ? { ...current, activationUrl: data.activationUrl } : current);
        else setActivationUrl(data.activationUrl);
      } else if (kind === "reset" && data?.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "No se pudo generar el enlace.");
    } finally {
      setGenerandoEnlace(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const accesoPortal = client && revocarAccesoPortal
        ? { revocar: true }
        : !client
          ? crearAccesoPortal ? { invitar: true } : undefined
          : portalAccess?.tieneAcceso
            ? portalAccess.activo && modificarUsuario ? { nombreUsuario } : undefined
            : crearAccesoPortal ? { invitar: true } : undefined;
      const response = await authenticatedFetch(
        client ? `/clientes/${client.id}` : "/clientes",
        {
          method: client ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ...(accesoPortal ? { accesoPortal } : {}),
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
        throw new Error(message || (client ? "No fue posible actualizar el cliente." : "No fue posible crear el cliente."));
      }

      const responseClient = (await response.json()) as Partial<ClientRecord> & { accesoPortal?: { activationUrl?: string } };
      const savedId = String(responseClient.id ?? client?.id ?? "");
      setPortalClientId(savedId);
      let inviteLink = responseClient.accesoPortal?.activationUrl;
      if (!inviteLink && accesoPortal?.invitar && savedId) {
        try {
          const accessResponse = await authenticatedFetch(`/clientes/${savedId}/acceso-portal`);
          if (accessResponse.ok) {
            const access = (await accessResponse.json()) as PortalAccess;
            inviteLink = access.activationUrl;
            setPortalAccess(access);
          }
        } catch {
          // El cliente ya se guardó; se podrá generar el enlace desde Editar.
        }
      }
      onSaved({ ...form, ...responseClient, id: savedId || String(Date.now()) });
      if (inviteLink) {
        setActivationUrl(inviteLink);
        setLinkCopiado(false);
      } else {
        onClose();
      }
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
        className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:max-h-[calc(100vh-4rem)]"
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5 sm:px-8">
          <div>
            <h2 id="new-client-title" className="text-xl font-bold text-text-primary">
              {client ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {client ? "Actualiza los datos del cliente en TRIBUTEK." : "Registra un nuevo cliente en TRIBUTEK."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={requestClose}
            className="rounded-lg p-2 text-2xl leading-none text-text-muted hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8">
            {activationUrl && (
              <section className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <h3 className="font-semibold">Cliente creado correctamente</h3>
                <p className="mt-2 font-medium">Acceso al portal: Pendiente de activaci&oacute;n</p>
                <p className="mt-2">Enlace de activaci&oacute;n (vence en 24 horas):</p>
                <p className="mt-2 text-sm">El enlace está oculto. Usa <span className="font-semibold">Copiar enlace</span> para compartirlo.</p>
                <button type="button" className="mt-3 rounded-lg border border-emerald-800 px-3 py-2 font-semibold" onClick={() => void copyInvitation(activationUrl)}>{linkCopiado ? "Enlace copiado" : "Copiar enlace"}</button>
                <button type="button" disabled={generandoEnlace} className="ml-2 mt-3 rounded-lg border border-emerald-800 px-3 py-2 font-semibold disabled:opacity-60" onClick={() => void generatePortalLink("invite")}>{generandoEnlace ? "Generando..." : "Generar nuevo enlace"}</button>
              </section>
            )}
            {!activationUrl && (<>
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
            {(!client || portalAccess !== null) && (
              <section className="sm:col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#252f46]">Acceso al portal</h3>
                  <span className="group relative inline-flex size-5 cursor-help items-center justify-center rounded-full border border-slate-400 text-xs font-bold text-slate-600" tabIndex={0} aria-label="Ayuda sobre el acceso al portal">
                    ?
                    <span className="invisible absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 p-3 text-left text-xs font-normal normal-case tracking-normal text-white shadow-lg group-hover:visible group-focus:visible">Al habilitar el acceso, se crea un enlace de invitación. El cliente lo usa para configurar su nombre de usuario y contraseña.</span>
                  </span>
                </div>
                {client && portalAccess?.tieneAcceso && !revocarAccesoPortal && (
                  <div className="mt-3 space-y-3">
                    {portalAccess.activo ? (
                      <>
                        <p className="text-sm text-slate-700">Estado: <span className="font-semibold text-emerald-700">Activo</span></p>
                        <p className="text-sm text-slate-700">Usuario: <span className="font-semibold">{portalAccess.nombreUsuario}</span></p>
                        {modificarUsuario && <Field label="Nuevo nombre de usuario" required>
                          <input autoComplete="username" value={nombreUsuario} onChange={(event) => updateNombreUsuario(event.target.value)} className={inputClassName} required />
                        </Field>}
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46]" onClick={() => { setModificarUsuario((current) => !current); setNombreUsuario(portalAccess.nombreUsuario ?? ""); }}>{modificarUsuario ? "Cancelar modificación" : "Modificar usuario"}</button>
                          <button type="button" disabled={generandoEnlace} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46] disabled:opacity-60" onClick={() => void generatePortalLink("reset")}>{generandoEnlace ? "Generando..." : "Generar enlace de restablecimiento"}</button>
                        </div>
                        {resetUrl && <div className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium">Enlace para restablecer contraseña:</p>
                          <p className="mt-1 text-slate-600">El enlace está oculto. Usa el botón para copiarlo.</p>
                          <button type="button" className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46]" onClick={() => void copyInvitation(resetUrl)}>{linkCopiado ? "Enlace copiado" : "Copiar enlace"}</button>
                        </div>}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-700">Acceso pendiente de configuración por el cliente.</p>
                        {portalAccess.activationUrl && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500">La invitación vence en 24 horas.</p>
                            <p className="text-sm text-slate-600">El enlace está oculto. Usa <span className="font-semibold">Copiar enlace</span> para compartirlo.</p>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46]" onClick={() => void copyInvitation(portalAccess.activationUrl!)}>{linkCopiado ? "Enlace copiado" : "Copiar enlace"}</button>
                              <button type="button" disabled={generandoEnlace} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#252f46] disabled:opacity-60" onClick={() => void generatePortalLink("invite")}>{generandoEnlace ? "Generando..." : "Generar nuevo enlace"}</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {client && portalAccess?.tieneAcceso && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-red-800">
                      <input type="checkbox" checked={revocarAccesoPortal} onChange={(event) => setRevocarAccesoPortal(event.target.checked)} className="size-4 accent-red-700" />
                      Desactivar acceso al portal
                    </label>
                    {revocarAccesoPortal && <p className="mt-2 text-xs text-slate-600">Se quitará la asociación con este cliente al guardar. El acceso a otras empresas asociadas se conservará.</p>}
                  </div>
                )}
                {(!client || portalAccess?.tieneAcceso === false) && (
                  <>
                    <label className="mt-3 flex items-center gap-2 text-sm font-medium text-[#252f46]">
                      <input type="checkbox" checked={crearAccesoPortal} onChange={(event) => setCrearAccesoPortal(event.target.checked)} className="size-4 accent-[#252f46]" />
                      Habilitar acceso al portal
                    </label>
                    <p className="ml-6 mt-2 text-sm text-slate-600">El acceso al portal es opcional. Act&iacute;valo &uacute;nicamente para los clientes que necesiten ingresar a TRIBUTEK y consultar o gestionar su informaci&oacute;n.</p>
                    {crearAccesoPortal && <p className="ml-6 mt-3 text-sm text-slate-600">Al habilitar el acceso, se crea un enlace de invitaci&oacute;n. El cliente lo usar&aacute; para configurar su nombre de usuario y contrase&ntilde;a.</p>}
                  </>
                )}
              </section>
            )}
            </>)}
            {error && <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <button type="button" onClick={requestClose} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-[#252f46] hover:bg-slate-50">{activationUrl ? "Cerrar" : "Cancelar"}</button>
            <button type="submit" disabled={isSubmitting || Boolean(activationUrl)} className="rounded-lg bg-[#252f46] px-5 py-3 text-sm font-semibold text-white hover:bg-[#344463] disabled:cursor-wait disabled:opacity-60">
              {activationUrl ? "Invitación creada" : isSubmitting
                ? client ? "Guardando cambios..." : "Creando cliente..."
                : client ? "Guardar cambios" : "Crear cliente"}
            </button>
          </footer>
        </form>
      </section>

      {showDiscardConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="discard-title" className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-2xl">
            <h3 id="discard-title" className="text-lg font-bold text-text-primary">¿Deseas salir?</h3>
            <p className="mt-2 text-sm text-text-muted">Los datos ingresados se perderán.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDiscardConfirmation(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-primary">Continuar editando</button>
              <button type="button" onClick={onClose} className="rounded-lg bg-[#252f46] px-4 py-2.5 text-sm font-semibold text-white">Salir</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const inputClassName = "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary";

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-sm font-medium text-text-primary ${className}`}>
      <span>{label}{required && <span className="ml-1 text-error" aria-hidden="true">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
