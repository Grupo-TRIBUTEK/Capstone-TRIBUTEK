export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Header del portal cliente */}
      
      <main>
        {children}
      </main>
    </div>
  );
}