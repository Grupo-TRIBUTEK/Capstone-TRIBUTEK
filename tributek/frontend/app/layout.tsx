import type { Metadata } from "next";
import "./globals.css";
import "./components/management/management.css";

export const metadata: Metadata = {
  title: "TRIBUTEK",
  description: "Sistema de gestión administrativa",
  icons: {
    icon: "/icons/icon-TRIBUTEK.svg",
  },
};

export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
