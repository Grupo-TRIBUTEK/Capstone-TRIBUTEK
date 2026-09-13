import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Mensajes",
  "description": "Prepara comunicaciones para revisarlas antes de compartirlas.",
  "icon": "message",
  "action": "Preparar mensaje",
  "metrics": [
    "Borradores",
    "Clientes seleccionados",
    "Períodos consultados"
  ],
  "columns": [
    "Cliente",
    "Tipo de mensaje",
    "Período",
    "Revisión"
  ],
  "emptyTitle": "Los borradores estarán aquí",
  "emptyDescription": "La preparación y copia de mensajes se habilitarán con información validada.",
  "notes": [
    {
      "title": "Revisión del texto",
      "description": "La administradora podrá revisar el destinatario, los conceptos y el contenido antes de compartir."
    },
    {
      "title": "Envío bajo control",
      "description": "No se enviarán mensajes automáticamente por WhatsApp. Las exportaciones se habilitarán cuando existan datos validados."
    }
  ],
  "related": [
    {
      "href": "/admin/pagos",
      "label": "Pagos"
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
