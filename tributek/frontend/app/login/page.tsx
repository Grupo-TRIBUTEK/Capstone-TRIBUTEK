//import { PrismaClient } from '@prisma/client';
//import argon2 from 'argon2';
import LoginForm from "@/app/components/features/auth/LoginForm";

//Instance of PrismaClient to interact with the database
//const prisma = new PrismaClient();

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="w-full max-w-md">
        <LoginForm />
      </section>
    </main>
  );
}