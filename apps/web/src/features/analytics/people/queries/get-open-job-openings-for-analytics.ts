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

export async function getOpenJobOpeningsForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(
    "get_tenant_recruitment_open_openings_v1",
    { p_company_id: companyId }
  )

  if (error) {
    throw new Error(
      "Não foi possível carregar as vagas abertas."
    )
  }

  const parsed = z
    .array(openOpeningRowSchema)
    .safeParse(data ?? [])

  if (!parsed.success) {
    throw new Error(
      "Não foi possível carregar as vagas abertas."
    )
  }

  return parsed.data.map((row) => ({
    status: row.status,
  }))
}
