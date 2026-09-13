import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Contabilidad",
  "description": "Antecedentes y revisión del resumen contable por cliente y período.",
  "icon": "calculator",
  "action": "Agregar antecedente",
  "metrics": [
    "Períodos por revisar",
    "Antecedentes recibidos",
    "Resúmenes preparados"
  ],
  "columns": [
    "Cliente",
    "Período",
    "Antecedentes",
    "Revisión"
  ],
  "emptyTitle": "La revisión contable estará aquí",
  "emptyDescription": "Este espacio reunirá antecedentes y resúmenes cuando se habilite el módulo.",
  "notes": [
    {
      "title": "Revisión de antecedentes",
      "description": "Organización de la información recibida antes de preparar un resumen."
    },
    {
      "title": "Resumen por período",
      "description": "Las reglas de cálculo y revisión se validarán con TRIBUTEK antes de habilitar resultados."
    }
  ],
  "related": [
    {
      "href": "/admin/documentos",
      "label": "Documentos"
    },
    {
      "href": "/admin/f29",
      "label": "Proyección F29"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
