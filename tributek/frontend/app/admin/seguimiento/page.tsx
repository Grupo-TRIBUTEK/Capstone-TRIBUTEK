import Header from "../../components/layout/Header";
import MonthlyWorkspace from "../../components/ficha/MonthlyWorkspace";
export default function Page() {
  return (
    <main>
      <Header
        title="Seguimiento mensual"
        description="Consulta cada ficha para actualizar el trabajo del mes y su próximo contacto."
      />
      <MonthlyWorkspace />
    </main>
  );
}
