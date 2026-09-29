import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getTenantSwitcherContext } from "@/features/tenant-access";
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tenantContext, { currentUser }] = await Promise.all([
    getTenantSwitcherContext(),
    getCurrentCompanyContext(),
  ]);

  return (
    <div className="min-h-screen bg-evol-surface">
      <Sidebar role={currentUser.role} />
      <div className="ml-64">
        <Header tenantContext={tenantContext} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
