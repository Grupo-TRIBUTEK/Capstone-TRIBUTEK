"use client";

import { FormEvent, useEffect, useState } from "react";
import { confirm2fa, disable2fa, get2faStatus, setup2fa } from "@/app/features/auth/auth-client";

type Status = { enabled: boolean; pending: boolean };

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [setupPassword, setSetupPassword] = useState("");
  const [setupData, setSetupData] = useState<{ otpauthUrl: string; qrCodeDataUrl: string; secret: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  async function refresh() {
    try {
      setLoading(true);
      setError("");
      const s = await get2faStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el estado de seguridad.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await get2faStatus();
        if (active) setStatus(s);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "No se pudo cargar el estado de seguridad.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function onSetup(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await setup2fa(setupPassword);
      setSetupData(data);
      setSetupPassword("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la configuración.");
    } finally { setBusy(false); }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await confirm2fa(confirmCode.trim());
      setNotice(res.mensaje || "2FA activado correctamente.");
      if (res.recoveryCodes?.length) setRecoveryCodes(res.recoveryCodes);
      setSetupData(null);
      setConfirmCode("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar el código.");
    } finally { setBusy(false); }
  }

  async function onDisable(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await disable2fa(disablePassword, disableCode.trim());
      setNotice(res.mensaje || "2FA desactivado.");
      setDisablePassword(""); setDisableCode("");
      setRecoveryCodes(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar 2FA.");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-6" aria-labelledby="seguridad-2fa-title">
      <div>
        <h2 id="seguridad-2fa-title" className="text-xl font-semibold text-text-primary">Autenticación en dos pasos (2FA)</h2>
        <p className="mt-1 text-sm text-text-muted">Protege tu cuenta con un código temporal generado en tu app autenticadora (Google/Microsoft Authenticator u otra compatible con TOTP).</p>
      </div>

      {loading && <p className="text-sm text-text-muted">Cargando estado de seguridad…</p>}
      {error && <p role="alert" className="rounded-lg border border-error-border bg-error-surface p-3 text-sm text-error">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-success-border bg-success-surface p-3 text-sm text-success">{notice}</p>}

      {status && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-primary">Estado: <span className={`font-semibold ${status.enabled ? "text-success" : "text-warning"}`}>{status.enabled ? "Activado" : status.pending ? "Pendiente de confirmación" : "Desactivado"}</span></p>
        </div>
      )}

      {recoveryCodes && (
        <div className="rounded-xl border border-warning-border bg-warning-surface p-4">
          <h3 className="font-semibold text-text-primary">Códigos de recuperación (mostrar una sola vez)</h3>
          <p className="mt-1 text-sm text-text-muted">Guárdalos en un lugar seguro. Cada código se almacena como hash en el servidor y puede usarse una sola vez para recuperar el acceso si pierdes tu autenticador. Usar un código de recuperación no desactiva 2FA. No se volverán a mostrar.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-text-primary sm:grid-cols-4">
            {recoveryCodes.map((c) => <li key={c} className="rounded border border-border bg-surface px-2 py-1 text-center">{c}</li>)}
          </ul>
        </div>
      )}

      {!status?.enabled && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-text-primary">Activar 2FA</h3>
          {!setupData ? (
            <form onSubmit={onSetup} className="space-y-3 max-w-md">
              <label className="block text-sm font-medium text-text-primary">Contraseña actual
                <input type="password" autoComplete="current-password" required value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <button type="submit" disabled={busy || !setupPassword} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Generando…" : "Generar código QR"}</button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">Escanea este código QR con tu app autenticadora. Si no puedes escanearlo, ingresa el secreto manualmente.</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <img src={setupData.qrCodeDataUrl} alt="Código QR para configurar 2FA" className="h-44 w-44 rounded-lg border border-border bg-white p-2" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Secreto manual</p>
                  <code className="mt-1 block break-all rounded border border-border bg-surface-muted p-2 text-xs text-text-primary">{setupData.secret}</code>
                  <p className="mt-2 text-xs text-text-muted">URI otpauth: <span className="break-all">{setupData.otpauthUrl}</span></p>
                </div>
              </div>
              <form onSubmit={onConfirm} className="space-y-3 max-w-md">
                <label className="block text-sm font-medium text-text-primary">Código de 6 dígitos para confirmar
                  <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))} className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="000000" />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || confirmCode.length < 6} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Confirmando…" : "Confirmar y activar"}</button>
                  <button type="button" disabled={busy} onClick={() => { setSetupData(null); setConfirmCode(""); }} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-muted disabled:opacity-60">Cancelar</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {status?.enabled && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold text-text-primary">Desactivar 2FA</h3>
          <p className="text-sm text-text-muted">Para desactivar la verificación en dos pasos, confirma tu contraseña y un código actual de tu app autenticadora.</p>
          <form onSubmit={onDisable} className="space-y-3 max-w-md">
            <label className="block text-sm font-medium text-text-primary">Contraseña actual
              <input type="password" autoComplete="current-password" required value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="block text-sm font-medium text-text-primary">Código 2FA actual
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))} className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-3 text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="000000" />
            </label>
            <button type="submit" disabled={busy || !disablePassword || disableCode.length < 6} className="rounded-lg border border-error-border bg-error-surface px-4 py-2.5 text-sm font-semibold text-error hover:opacity-90 disabled:opacity-60">{busy ? "Desactivando…" : "Desactivar 2FA"}</button>
          </form>
        </div>
      )}
    </section>
);
}
