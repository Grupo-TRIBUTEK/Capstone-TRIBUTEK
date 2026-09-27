import type { Metadata } from "next";
import "./globals.css";
import "./components/management/management.css";
import "./theme.css";
import { ThemeManager } from "./components/layout/Theme";

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
      suppressHydrationWarning
    >
      <head>
        <script id="tributek-theme-init" dangerouslySetInnerHTML={{ __html: `(function(){var t='system';try{t=localStorage.getItem('tributek-theme')||'system';}catch(e){}var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';})();` }} />
      </head>
      <body className="min-h-full flex flex-col"><ThemeManager />{children}</body>
    </html>
  );
}
