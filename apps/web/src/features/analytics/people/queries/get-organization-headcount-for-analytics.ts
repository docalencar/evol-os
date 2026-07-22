import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

export async function getOrganizationHeadcountForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database
    .from("recruitment_job_openings")
    .select("current_headcount, target_headcount")
    .eq("company_id", companyId)
    .eq("status", "open")
    .is("deleted_at", null)

  if (error) {
    throw new Error(
      "Não foi possível carregar a estrutura planejada."
    )
  }

  return (data ?? []).map((snapshot) => ({
    currentHeadcount: snapshot.current_headcount,
    targetHeadcount: snapshot.target_headcount,
  }))
}
