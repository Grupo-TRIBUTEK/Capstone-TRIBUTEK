import type { IconName } from "../ui/Icon";

export const adminNavigation: { href: string; label: string; icon: IconName; group: string }[] = [
  { href: "/admin", label: "Inicio", icon: "home", group: "Gestión" },
  { href: "/admin/clientes", label: "Clientes", icon: "users", group: "Gestión" },
  { href: "/admin/servicios", label: "Servicios", icon: "briefcase", group: "Gestión" },
  { href: "/admin/seguimiento", label: "Seguimiento mensual", icon: "calendar", group: "Gestión" },
  { href: "/admin/contabilidad", label: "Contabilidad", icon: "calculator", group: "Gestión" },
  { href: "/admin/documentos", label: "Documentos", icon: "file", group: "Gestión" },
  { href: "/admin/f29", label: "Proyección F29", icon: "file", group: "Gestión" },
  { href: "/admin/pagos", label: "Pagos", icon: "wallet", group: "Gestión" },
  { href: "/admin/rrhh", label: "Recursos Humanos", icon: "team", group: "Gestión" },
  { href: "/admin/mensajes", label: "Mensajes", icon: "message", group: "Gestión" },
  { href: "/admin/auditoria", label: "Auditoría", icon: "shield", group: "Administración" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", group: "Administración" },
];
