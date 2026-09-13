import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Clientes",
  "description": "Ficha y seguimiento de los clientes de TRIBUTEK.",
  "icon": "users",
  "action": "Nuevo cliente",
  "metrics": [
    "Clientes registrados",
    "Servicios vigentes",
    "Clientes con pendientes"
  ],
  "columns": [
    "Cliente / razón social",
    "RUT",
    "Servicios",
    "Estado"
  ],
  "emptyTitle": "Las fichas de clientes estarán aquí",
  "emptyDescription": "Aquí se reunirá la información de cada cliente y sus servicios.",
  "notes": [
    {
      "title": "Ficha del cliente",
      "description": "Datos de contacto, servicios y accesos a sus antecedentes."
    },
    {
      "title": "Información relacionada",
      "description": "Documentos, gestiones y pagos vinculados a la ficha."
    }
  ],
  "related": [
    {
      "href": "/admin/servicios",
      "label": "Servicios"
    },
    {
      "href": "/admin/documentos",
      "label": "Documentos"
    },
    {
      "href": "/admin/pagos",
      "label": "Pagos"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
