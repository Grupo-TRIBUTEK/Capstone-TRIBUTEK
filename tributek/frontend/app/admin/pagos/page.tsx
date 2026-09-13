import AdminSection, { type AdminSectionProps } from "../../components/layout/AdminSection";

const section: AdminSectionProps = {
  "title": "Pagos",
  "description": "Consulta de cobros, abonos e historial por cliente.",
  "icon": "wallet",
  "action": "Registrar abono",
  "metrics": [
    "Cobros del período",
    "Abonos registrados",
    "Saldos pendientes"
  ],
  "columns": [
    "Cliente",
    "Período",
    "Total",
    "Abonado",
    "Saldo"
  ],
  "emptyTitle": "Los cobros y abonos estarán aquí",
  "emptyDescription": "Los montos se mostrarán cuando las reglas y los registros estén integrados.",
  "notes": [
    {
      "title": "Historial de abonos",
      "description": "Registro de monto, fecha y descripción del pago."
    },
    {
      "title": "Seguimiento del cobro",
      "description": "Consulta de conceptos y saldos. La asignación y corrección de pagos se implementarán con las reglas acordadas."
    }
  ],
  "related": [
    {
      "href": "/admin/clientes",
      "label": "Clientes"
    },
    {
      "href": "/admin/mensajes",
      "label": "Mensajes"
    }
  ]
};

export default function Page() {
  return <AdminSection {...section} />;
}
