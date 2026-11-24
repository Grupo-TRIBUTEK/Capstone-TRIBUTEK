/**
 * Catálogo de rutas y etiquetas del menú administrativo; Sidebar lo utiliza para construir la navegación.
 */
import type { IconName } from "../ui/Icon";
export const adminNavigation: {
  href: string;
  label: string;
  icon: IconName;
  group: string;
}[] = [
  { href: "/admin", label: "Inicio", icon: "home", group: "Principal" },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: "users",
    group: "Principal",
  },
  {
    href: "/admin/obligaciones",
    label: "Obligaciones",
    icon: "calendar",
    group: "Gestión mensual",
  },
  {
    href: "/admin/facturacion",
    label: "Facturación",
    icon: "file",
    group: "Gestión mensual",
  },
  { href: "/admin/pagos", label: "Pagos", icon: "wallet", group: "Gestión mensual" },
  {
    href: "/admin/postergaciones",
    label: "Postergaciones",
    icon: "calendar",
    group: "Gestión mensual",
  },
  { href: "/admin/f29", label: "Proyección F29", icon: "file", group: "Gestión mensual" },
  {
    href: "/admin/formalizaciones",
    label: "Constitución de empresas",
    icon: "briefcase",
    group: "Control",
  },
  { href: "/admin/auditoria", label: "Trazabilidad", icon: "shield", group: "Control" },
  { href: "/admin/seguridad", label: "Seguridad", icon: "shield", group: "Control" },
];