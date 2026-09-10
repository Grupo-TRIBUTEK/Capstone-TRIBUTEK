import type { ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-800 md:flex">
      <Sidebar />

      <div className="min-w-0 flex-1 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}