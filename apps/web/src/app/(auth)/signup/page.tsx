import { SignupForm } from "@/features/auth"

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-evol-surface px-4">
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="mt-2 text-sm text-slate-600">Comece organizando pessoas e líderes em poucos minutos.</p>
        <SignupForm />
      </div>
    </main>
  );
}
