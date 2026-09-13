import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Configuración",
  "description": "Organización de cuentas, acceso y continuidad del servicio.",
  "icon": "settings",
  "action": "Administrar cuentas",
  "metrics": [
    "Cuentas individuales",
    "Acceso protegido",
    "Respaldos"
  ],
  "columns": [
    "Área",
    "Descripción",
    "Disponibilidad"
  ],
  "emptyTitle": "La configuración estará aquí",
  "emptyDescription": "La gestión de cuentas, seguridad y respaldos todavía no está habilitada.",
  "notes": [
    {
      "title": "Cuentas y acceso",
      "description": "Cuentas individuales sin registro público. La segunda validación y recuperación están pendientes de acuerdo e implementación."
    },
    {
      "title": "Respaldos y recuperación",
      "description": "Su configuración y comprobación serán parte de la entrega técnica de Brandon."
    }
  ],
  "related": [
    {
      "href": "/admin/auditoria",
      "label": "Auditoría"
    },
    {
      "href": "/admin/servicios",
      "label": "Servicios"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
