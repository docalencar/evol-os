import "server-only"

import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

const pendingApprovalRowSchema = z
  .object({
    status: z.literal("pending"),
  })
  .strict()

export async function getPendingJobOpeningApprovalsForAnalytics(
  companyId: string
) {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(
    "get_tenant_recruitment_pending_approvals_v1",
    { p_company_id: companyId }
  )

  if (error) {
    throw new Error(
      "Não foi possível carregar as aprovações pendentes."
    )
  }

  const parsed = z
    .array(pendingApprovalRowSchema)
    .safeParse(data ?? [])

  if (!parsed.success) {
    throw new Error(
      "Não foi possível carregar as aprovações pendentes."
    )
  }

  return parsed.data.map((row) => ({
    status: row.status,
  }))
}
