import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

export async function getActiveEmployeesForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database
    .from("people")
    .select("status")
    .eq("company_id", companyId)
    .eq("status", "active")

  if (error) {
    throw new Error(
      "Não foi possível carregar o headcount."
    )
  }

  return data ?? []
}
