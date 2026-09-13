import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Auditoría",
  "description": "Consulta de acciones registradas para mantener la trazabilidad.",
  "icon": "shield",
  "action": "Exportar registros",
  "metrics": [
    "Acciones registradas",
    "Cuentas identificadas",
    "Períodos disponibles"
  ],
  "columns": [
    "Fecha y hora",
    "Cuenta",
    "Acción",
    "Registro afectado"
  ],
  "emptyTitle": "La actividad registrada estará aquí",
  "emptyDescription": "El historial se mostrará cuando el registro de eventos esté integrado.",
  "notes": [
    {
      "title": "Identificación individual",
      "description": "Las acciones deberán quedar asociadas a la cuenta autenticada."
    },
    {
      "title": "Consulta del historial",
      "description": "Esta vista permitirá revisar eventos, no editar ni borrar el historial desde el listado."
    }
  ],
  "related": [
    {
      "href": "/admin/configuracion",
      "label": "Configuración"
    },
    {
      "href": "/admin/clientes",
      "label": "Clientes"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
