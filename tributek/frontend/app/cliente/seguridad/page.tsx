"use client";

import Link from "next/link";
import TwoFactorSettings from "@/app/components/features/auth/TwoFactorSettings";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/cliente" className="mb-6 inline-flex items-center gap-2 text-body-sm font-semibold text-text-muted transition-colors hover:text-text-primary">
        <span aria-hidden="true">←</span> Volver al panel
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Seguridad</h1>
        <p className="mt-1 text-sm text-text-muted">Administra la protección de tu cuenta.</p>
      </header>
      <TwoFactorSettings />
    </main>
  );
}
