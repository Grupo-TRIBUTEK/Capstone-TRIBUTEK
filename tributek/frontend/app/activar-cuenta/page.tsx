"use client";

import { useEffect, useState } from "react";

export default function ActivarCuentaPage() {
  const [esRestablecimiento, setEsRestablecimiento] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [activada, setActivada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setEsRestablecimiento(new URLSearchParams(window.location.search).get("modo") === "restablecer");
  }, []);

  async function activar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMensaje("");
    if (!esRestablecimiento && !nombreUsuario.trim()) {
      setError("Ingresa un nombre de usuario.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      const response = await fetch("/auth/activar-cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...(esRestablecimiento ? {} : { nombreUsuario }), password, confirmarPassword: confirmacion }),
      });
      const data = (await response.json().catch(() => null)) as { mensaje?: string; message?: string | string[] } | null;
      if (!response.ok) {
        const reason = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
        throw new Error(reason || "No fue posible activar la cuenta. Solicita un nuevo enlace al administrador.");
      }
      setMensaje(data?.mensaje || "Cuenta activada. Ya puedes iniciar sesión.");
      setActivada(true);
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Ocurrió un error al activar la cuenta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-[#252f46]">{esRestablecimiento ? "Restablece tu contrase\u00f1a" : "Configura tu acceso al portal"}</h1>
        <p className="mt-2 text-sm text-slate-600">{esRestablecimiento ? "Elige una contrase\u00f1a nueva para tu cuenta TRIBUTEK." : "Elige tu nombre de usuario y contrase\u00f1a para activar tu acceso al portal TRIBUTEK."}</p>
        {activada ? (
          <div className="mt-6">
            <p role="status" className="text-sm text-emerald-800">{mensaje}</p>
            <a href="/login" className="mt-5 inline-flex rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white">Ir al inicio de sesión</a>
          </div>
        ) : (
          <form onSubmit={activar} className="mt-6 space-y-4">
            {!esRestablecimiento && (
            <label className="block text-sm font-medium text-[#252f46]">
              Nombre de usuario
              <input type="text" autoComplete="username" minLength={1} maxLength={80} required value={nombreUsuario} onChange={(event) => setNombreUsuario(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#252f46] focus:ring-2 focus:ring-[#252f46]" />
            </label>
            )}
            <label className="block text-sm font-medium text-[#252f46]">
              Contraseña
              <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#252f46] focus:ring-2 focus:ring-[#252f46]" />
              <span className="mt-1 block text-xs font-normal text-slate-500">Debe tener al menos 10 caracteres.</span>
            </label>
            <label className="block text-sm font-medium text-[#252f46]">
              Confirmar contraseña
              <input type="password" autoComplete="new-password" minLength={10} required value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-[#252f46] focus:ring-2 focus:ring-[#252f46]" />
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {mensaje && <p role="status" className="text-sm text-emerald-800">{mensaje}</p>}
            <button type="submit" disabled={enviando} className="w-full rounded-lg bg-[#252f46] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{enviando ? "Activando cuenta..." : "Guardar contraseña"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
