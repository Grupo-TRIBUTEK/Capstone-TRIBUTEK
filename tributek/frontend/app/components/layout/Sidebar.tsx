"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/documentos", label: "Documentos" },
  { href: "/admin/f29", label: "Proyección F29" },
  { href: "/admin/pagos", label: "Pagos" },
  { href: "/admin/rrhh", label: "Recursos Humanos" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 bg-[#252f46] p-6 text-white md:min-h-screen md:w-64">
      <div className="border-b border-white/30 pb-6">
        <p className="text-2xl font-bold tracking-wide">
          TRIBUTEK
        </p>

        <p className="mt-1 text-sm text-slate-300">
          Gestión administrativa
        </p>
      </div>

      <nav aria-label="Menú administrativo" className="mt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-300">
          Menú principal
        </p>

        <ul className="space-y-3">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block rounded-lg border border-[#b98b7b] px-4 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                    isActive
                      ? "bg-[#b98b7b] text-[#252f46]"
                      : "hover:bg-[#b98b7b] hover:text-[#252f46]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}