import LoginForm from "@/app/components/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="w-full max-w-md">
        <LoginForm />
      </section>
    </main>
  );
}