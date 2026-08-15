import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getTenantSwitcherContext } from "@/features/tenant-access";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantContext = await getTenantSwitcherContext();

  return (
    <div className="min-h-screen bg-evol-surface">
      <Sidebar />
      <div className="ml-64">
        <Header tenantContext={tenantContext} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
