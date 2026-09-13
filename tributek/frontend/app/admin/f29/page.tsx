import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Proyección F29",
  "description": "Preparación y revisión de una proyección descargable por período.",
  "icon": "file",
  "action": "Preparar proyección",
  "metrics": [
    "Períodos en revisión",
    "Proyecciones preparadas",
    "Documentos disponibles"
  ],
  "columns": [
    "Cliente",
    "Período",
    "Revisión",
    "Documento"
  ],
  "emptyTitle": "Las proyecciones estarán aquí",
  "emptyDescription": "La preparación y descarga se habilitarán después de validar las reglas con TRIBUTEK.",
  "notes": [
    {
      "title": "Revisión antes de descargar",
      "description": "La información y el cálculo deberán ser revisados antes de habilitar el documento."
    },
    {
      "title": "Alcance de la proyección",
      "description": "Documento de apoyo descargable. No realiza presentación oficial ni pagos ante el SII."
    }
  ],
  "related": [
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
