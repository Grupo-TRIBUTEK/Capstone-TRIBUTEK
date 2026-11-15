"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuth, isLoginChallenge, login, verifyLogin2fa, type LoginSuccess } from "@/app/features/auth/auth-client";
import BrandLogo from "@/app/components/layout/BrandLogo";
import Icon from "@/app/components/ui/Icon";

/** Mantiene las credenciales, desafío 2FA y estado de envío del inicio de sesión. */
export default function LoginForm() {
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function redirectByRole(response: LoginSuccess) {
    const rolNombre = response.usuario.rolNombre?.toUpperCase();
    if (rolNombre === "ADMIN" || rolNombre === "ADMINISTRADOR" || response.usuario.rolId === "1") {
      router.replace("/admin");
    } else if (rolNombre === "CLIENTE") {
      router.replace("/cliente");
    } else {
      clearAuth();
      setError("Tu cuenta no tiene un rol habilitado para acceder a estos paneles.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await login(nombreUsuario, password);
      if (isLoginChallenge(response)) {
        setChallengeToken(response.challengeToken);
        setTwoFactorCode("");
      } else {
        redirectByRole(response);
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify2fa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeToken) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await verifyLogin2fa(challengeToken, twoFactorCode.trim());
      redirectByRole(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo verificar el código.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (challengeToken) {
    return (
      <form onSubmit={handleVerify2fa} className="tk-stack">
        <BrandLogo width={180} height={110} className="h-auto" />
        <div>
          <p className="tk-login-welcome">Verificación en dos pasos</p>
          <h1>Ingresa tu código</h1>
          <p className="tk-subtle">Escribe el código de 6 dígitos de tu app autenticadora o uno de tus códigos de recuperación para continuar.</p>
        </div>
        <label className="tk-field">
          Código de verificación o recuperación
          <input
            name="twoFactorCode"
            inputMode="text"
            autoComplete="one-time-code"
            required
            maxLength={32}
            placeholder="000000 o código de recuperación"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s+/g, ""))}
          />
        </label>
        {error && <p role="alert" className="tk-error">{error}</p>}
        <button className="primary" disabled={isSubmitting || twoFactorCode.trim().length < 6}>
          <Icon name="shield" className="h-4 w-4" />
          {isSubmitting ? "Verificando…" : "Confirmar código"}
        </button>
        <button
          type="button"
          className="tk-subtle"
          disabled={isSubmitting}
          onClick={() => {
            setChallengeToken(null);
            setTwoFactorCode("");
            setError("");
          }}
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Volver al inicio de sesión
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tk-stack">
      <BrandLogo width={180} height={110} className="h-auto" />
      <div>
        <p className="tk-login-welcome">Bienvenido de nuevo</p>
        <h1>Ingresa a tu cuenta</h1>
        <p className="tk-subtle">Accede con tu nombre de usuario o correo electrónico.</p>
      </div>
      <label className="tk-field">
        Correo o nombre de usuario
        <input
          name="username"
          autoComplete="username"
          required
          placeholder="usuario@correo.cl"
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p role="alert" className="tk-error">{error}</p>}
      <button className="primary" disabled={isSubmitting}>
        <Icon name="login" className="h-4 w-4" />
        {isSubmitting ? "Validando…" : "Entrar a mi cuenta"}
      </button>
      <Link href="/" className="tk-subtle">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Volver al inicio
      </Link>
    </form>
  );
}
