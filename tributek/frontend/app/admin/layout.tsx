"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/layout/Sidebar";
import { getAccessToken, validateAdminAccess } from "@/app/features/auth/auth-client";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function validateAccess() {
      if (!getAccessToken() || !(await validateAdminAccess())) {
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
      }
    }

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Validando sesión...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 md:flex">
      <Sidebar />

      <div className="min-w-0 flex-1 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}