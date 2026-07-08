import { LogoutButton } from "@/features/auth/components/logout-button";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Bem-vindo à Evol</p>
          <h1 className="text-xl font-semibold text-slate-900">Desenvolva líderes que desenvolvem pessoas</h1>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-evol-blue text-sm font-semibold text-white">
            GA
          </div>
        </div>
      </div>
    </header>
  );
}
