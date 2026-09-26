import LoginForm from "@/app/components/features/auth/LoginForm";
import ThemeSelect from "@/app/components/layout/Theme";
export default function LoginPage() {
  return (
    <div className="tk tk-login">
      <aside>
        <p className="tk-eyebrow">Gestión contable</p>
        <h1>Tu trabajo mensual, en orden.</h1>
        <p>Clientes, obligaciones y pagos en un mismo lugar.</p>
      </aside>
      <main>
        <div className="login-theme"><ThemeSelect /></div>
        <LoginForm />
      </main>
    </div>
  );
}
