/**
 * Página de la ruta /admin/auditoria. Next.js utiliza page.tsx para publicar esta vista.
 */
import AuditWorkspace from "@/app/components/auditoria/AuditWorkspace";

/** Publica la vista administrativa de auditoria. La lógica de la pantalla está en el componente importado. */
export default function Page() {
  return <AuditWorkspace />;
}
