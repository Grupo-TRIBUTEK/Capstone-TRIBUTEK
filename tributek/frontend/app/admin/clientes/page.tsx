import Header from "../../components/layout/Header";
import MonthlyWorkspace from "../../components/ficha/MonthlyWorkspace";
export default function Page() {
  return (
    <main>
      <Header
        title="Clientes y ficha mensual"
        description="Revisa los conceptos, el trabajo y los contactos de cada período."
      />
      <MonthlyWorkspace />
    </main>
  );
}
