import type { IconName } from "../ui/Icon";
export const adminNavigation: {
  href: string;
  label: string;
  icon: IconName;
  group: string;
}[] = [
  { href: "/admin", label: "Inicio", icon: "home", group: "Gestión" },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: "users",
    group: "Gestión",
  },
  {
    href: "/admin/obligaciones",
    label: "Obligaciones",
    icon: "calendar",
    group: "Gestión",
  },
  {
    href: "/admin/facturacion",
    label: "Facturación",
    icon: "file",
    group: "Gestión",
  },
  { href: "/admin/pagos", label: "Pagos", icon: "wallet", group: "Gestión" },
  {
    href: "/admin/postergaciones",
    label: "Postergaciones",
    icon: "calendar",
    group: "Gestión",
  },
  {
    href: "/admin/formalizaciones",
    label: "Formalizaciones",
    icon: "briefcase",
    group: "Gestión",
  },
];
