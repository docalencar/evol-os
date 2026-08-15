import { LogoutButton } from "@/features/auth"
import { TenantSwitcher, type TenantSwitcherContext } from "@/features/tenant-access"

export function Header({
  tenantContext,
}: {
  tenantContext: TenantSwitcherContext
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Bem-vindo à Evol</p>
          <h1 className="text-xl font-semibold text-slate-900">Desenvolva líderes que desenvolvem pessoas</h1>
        </div>
        <div className="flex items-center gap-3">
          <TenantSwitcher {...tenantContext} />
          <LogoutButton />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-evol-blue text-sm font-semibold text-white">
            GA
          </div>
        </div>
      </div>
    </header>
  );
}
