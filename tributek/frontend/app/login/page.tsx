/**
 * Página de la ruta /login. Next.js utiliza page.tsx para publicar esta vista.
 */
import LoginForm from "@/app/components/features/auth/LoginForm";
import ThemeSelect from "@/app/components/layout/Theme";
/** Compone la presentación del acceso y el formulario de inicio de sesión. */
export default function LoginPage() {
  return (
    <div className="tk tk-login">
      <aside className="login-panel-rings">
        <span className="tk-login-badge">
          <span className="hero-badge-dot" aria-hidden="true" />
          Gestión contable
        </span>
        <h1>
          <span className="tk-title-primary">Tu negocio,</span>{" "}
          <span className="tk-title-secondary">en orden.</span>
        </h1>
        <p>Clientes, obligaciones y pagos en un mismo lugar.</p>
      </aside>
      <main>
        <div className="login-theme">
          <ThemeSelect />
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
