import Header from "../components/layout/Header";
import AdminOverview from "../components/dashboard/AdminOverview";

export default function AdminPage() {
  return (
    <main>
      <Header
        title="Panel principal"
        description="Resumen y seguimiento de las gestiones de TRIBUTEK."
      />
      <AdminOverview />
    </main>
  );
}