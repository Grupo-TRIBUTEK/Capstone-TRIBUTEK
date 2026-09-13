import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Seguimiento mensual",
  "description": "Organiza las gestiones, antecedentes y vencimientos de cada período.",
  "icon": "calendar",
  "action": "Nueva gestión",
  "metrics": [
    "Gestiones del período",
    "Pendientes",
    "Próximos vencimientos"
  ],
  "columns": [
    "Cliente",
    "Período",
    "Gestión",
    "Vencimiento",
    "Estado"
  ],
  "emptyTitle": "El seguimiento mensual estará aquí",
  "emptyDescription": "Se mostrarán las gestiones del período y sus pendientes.",
  "notes": [
    {
      "title": "Checklist y estados",
      "description": "Revisión de tareas realizadas y pendientes por cliente y período."
    },
    {
      "title": "Notas internas",
      "description": "Observaciones de uso exclusivo de Administradora; no se mostrarán en el Portal Cliente."
    }
  ],
  "related": [
    {
      "href": "/admin/clientes",
      "label": "Clientes"
    },
    {
      "href": "/admin/contabilidad",
      "label": "Contabilidad"
    },
    {
      "href": "/admin/documentos",
      "label": "Documentos"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
