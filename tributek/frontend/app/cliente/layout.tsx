/**
 * Estructura compartida de estas rutas. Recibe children, el contenido de la página que Next.js está mostrando.
 */
import ClientNavbar from "./components/ClientNavbar";
import IaAssistant from "../components/IaAssistant";

/** Compone la navegación, contenido y asistente compartidos por el portal. */
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      {children}
      <IaAssistant />
    </div>
  );
}
