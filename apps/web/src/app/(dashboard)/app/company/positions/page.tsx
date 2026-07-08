import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  getPositions,
  PositionCreateDialog,
  PositionTable,
} from "@/features/organization/positions";
import { createClient } from "@/lib/supabase/supabase/server";

export default async function PositionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1);

  const companyId = memberships?.[0]?.company_id;

  if (!companyId) {
    redirect("/onboarding");
  }

  const positions = await getPositions(companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargos"
        description="Organize os cargos da empresa."
        actions={<PositionCreateDialog companyId={companyId} />}
      />

      <PositionTable positions={positions ?? []} />
    </div>
  );
}
