import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

const openOpeningRowSchema = z
  .object({
    status: z.literal("open"),
    current_headcount: z.number().int(),
    target_headcount: z.number().int(),
  })
  .strict()

export async function getOrganizationHeadcountForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(
    "get_tenant_recruitment_open_openings_v1",
    { p_company_id: companyId }
  )

  if (error) {
    throw new Error(
      "Não foi possível carregar a estrutura planejada."
    )
  }

  const parsed = z
    .array(openOpeningRowSchema)
    .safeParse(data ?? [])

  if (!parsed.success) {
    throw new Error(
      "Não foi possível carregar a estrutura planejada."
    )
  }

  return parsed.data.map((snapshot) => ({
    currentHeadcount: snapshot.current_headcount,
    targetHeadcount: snapshot.target_headcount,
  }))
}
