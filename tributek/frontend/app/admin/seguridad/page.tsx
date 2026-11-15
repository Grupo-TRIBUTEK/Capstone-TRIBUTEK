import TwoFactorSettings from "@/app/components/features/auth/TwoFactorSettings";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Seguridad</h1>
        <p className="mt-1 text-sm text-text-muted">Administra la protección de tu cuenta.</p>
      </header>
      <TwoFactorSettings />
    </div>
  );
}
