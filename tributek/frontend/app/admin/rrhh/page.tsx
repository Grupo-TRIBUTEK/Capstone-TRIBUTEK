import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Recursos Humanos",
  "description": "Información laboral y antecedentes de las empresas clientes.",
  "icon": "team",
  "action": "Agregar trabajador",
  "metrics": [
    "Empresas con servicio",
    "Trabajadores registrados",
    "Documentos pendientes"
  ],
  "columns": [
    "Empresa",
    "Trabajador",
    "Documentación",
    "Estado"
  ],
  "emptyTitle": "Los antecedentes laborales estarán aquí",
  "emptyDescription": "Las empresas, trabajadores y documentos se conectarán en una próxima entrega.",
  "notes": [
    {
      "title": "Trabajadores por empresa",
      "description": "Organización de los trabajadores asociados a cada empresa cliente."
    },
    {
      "title": "Documentación laboral",
      "description": "Revisión de antecedentes y pendientes del servicio de Recursos Humanos."
    }
  ],
  "related": [
    {
      "href": "/admin/clientes",
      "label": "Clientes"
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
