import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-evol-surface px-4">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Entrar na Evol</h1>
        <p className="mt-2 text-sm text-slate-600">Acesse sua conta para desenvolver sua equipe.</p>
        <LoginForm />
      </div>
    </main>
  );
}
