import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Servicios",
  "description": "Organización de los servicios ofrecidos y contratados.",
  "icon": "briefcase",
  "action": "Agregar servicio",
  "metrics": [
    "Servicios disponibles",
    "Contrataciones",
    "Clientes asociados"
  ],
  "columns": [
    "Servicio",
    "Descripción",
    "Cliente asociado",
    "Vigencia"
  ],
  "emptyTitle": "Catálogo de servicios en preparación",
  "emptyDescription": "El catálogo y las contrataciones se mostrarán cuando estén disponibles.",
  "notes": [
    {
      "title": "Catálogo",
      "description": "Servicios que ofrece TRIBUTEK y su descripción."
    },
    {
      "title": "Contrataciones",
      "description": "Asociación de servicios a clientes y seguimiento de su vigencia."
    }
  ],
  "related": [
    {
      "href": "/admin/clientes",
      "label": "Clientes"
    },
    {
      "href": "/admin/seguimiento",
      "label": "Seguimiento mensual"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
