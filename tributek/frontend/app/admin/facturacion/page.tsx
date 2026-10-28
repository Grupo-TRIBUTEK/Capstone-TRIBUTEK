/**
 * Página de la ruta /admin/facturacion. Next.js utiliza page.tsx para publicar esta vista.
 */
import Workspace from "@/app/components/management/Workspace";
/** Publica la vista administrativa de facturacion. La lógica de la pantalla está en el componente importado. */
export default function Page() {
  return <Workspace view="facturacion" />;
}
