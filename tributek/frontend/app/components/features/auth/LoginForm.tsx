"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuth, login } from "@/app/features/auth/auth-client";
import BrandLogo from "@/app/components/layout/BrandLogo";

export default function LoginForm() {
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login(nombreUsuario, password);

      const rolNombre = response.usuario.rolNombre?.toUpperCase();
      if (rolNombre === "ADMIN" || rolNombre === "ADMINISTRADOR" || response.usuario.rolId === "1") {
        router.replace("/admin");
      } else if (rolNombre === "CLIENTE") {
        router.replace("/cliente");
      } else {
        clearAuth();
        setError("Tu cuenta no tiene un rol habilitado para acceder a estos paneles.");
      }
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tk-stack">
      <BrandLogo width={180} height={110} className="h-auto" />
      <div>
        <h1>Ingresa a tu cuenta</h1>
        <p className="tk-subtle">Accede con tu nombre de usuario o correo electrónico.</p>
      </div>
      <label className="tk-field">
        Correo o nombre de usuario
        <input
          name="username"
          autoComplete="username"
          required
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
        />
      </label>
      <label className="tk-field">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="tk-error">
          {error}
        </p>
      )}
      <button className="primary" disabled={isSubmitting}>
        {isSubmitting ? "Validando…" : "Iniciar sesión"}
      </button>
      <Link href="/" className="tk-subtle">
        Volver al inicio
      </Link>
    </form>
  );
}
