import Link from "next/link";

export default function Sidebar() {
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

        <ul>
          <li>
            <Link
              href="/admin"
              className="block rounded-lg border border-[#b98b7b] px-4 py-3 font-medium transition-colors hover:bg-[#b98b7b] hover:text-[#252f46] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Inicio
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}