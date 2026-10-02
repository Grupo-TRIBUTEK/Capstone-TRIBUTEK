import ClientNavbar from "./components/ClientNavbar";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      {children}
    </div>
  );
}