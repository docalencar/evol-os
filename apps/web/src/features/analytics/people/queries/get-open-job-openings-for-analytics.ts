import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type {
  JobOpeningStatus,
} from "@/features/recruitment"

export async function getOpenJobOpeningsForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database
    .from("recruitment_job_openings")
    .select("status")
    .eq("company_id", companyId)
    .eq("status", "open")
    .is("deleted_at", null)

  if (error) {
    throw new Error(
      "Não foi possível carregar as vagas abertas."
    )
  }

  return (data ?? []) as Array<{
    status: JobOpeningStatus
  }>
}
