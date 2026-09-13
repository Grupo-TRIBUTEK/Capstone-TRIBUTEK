import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Documentos",
  "description": "Organiza los antecedentes y documentos habilitados para cada cliente.",
  "icon": "file",
  "action": "Subir documento",
  "metrics": [
    "Documentos recibidos",
    "Pendientes de revisión",
    "Habilitados para clientes"
  ],
  "columns": [
    "Archivo",
    "Cliente",
    "Categoría",
    "Período",
    "Estado"
  ],
  "emptyTitle": "El archivo documental estará aquí",
  "emptyDescription": "Todavía no hay una consulta de documentos conectada a esta vista.",
  "notes": [
    {
      "title": "Recepción y revisión",
      "description": "Antecedentes asociados al cliente y al período correspondiente."
    },
    {
      "title": "Visibilidad en el portal",
      "description": "Cada cliente podrá acceder únicamente a sus documentos habilitados."
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
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
