import ClientNavbar from "./components/ClientNavbar";
import IaAssistant from "../components/IaAssistant";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      {children}
      <IaAssistant />
    </div>
  );
}
