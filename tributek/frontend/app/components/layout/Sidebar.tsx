"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "../ui/Icon";
import { adminNavigation } from "./adminNavigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 bg-[#252f46] p-5 text-white md:min-h-screen md:w-64">
      <div className="border-b border-white/20 pb-5">
        <p className="text-2xl font-bold tracking-wide">TRIBUTEK</p>
        <p className="mt-1 text-sm text-slate-300">Gestión administrativa</p>
      </div>
      <nav aria-label="Menú administrativo" className="mt-5 space-y-6">
        {["Gestión", "Administración"].map((group) => (
          <div key={group}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-300">{group}</p>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-1">
              {adminNavigation.filter((item) => item.group === group).map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? "bg-[#b98b7b] text-[#252f46]" : "text-slate-200 hover:bg-white/10 hover:text-white"}`}>
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
