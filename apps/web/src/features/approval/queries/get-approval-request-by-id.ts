import "server-only"

import { z } from "zod"

import {
  createApprovalRequestRepository,
} from "../repositories"

const getApprovalRequestByIdSchema = z.object({
  companyId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
})

export type GetApprovalRequestByIdInput = z.input<
  typeof getApprovalRequestByIdSchema
>

export async function getApprovalRequestById(
  input: GetApprovalRequestByIdInput
) {
  const validatedInput =
    getApprovalRequestByIdSchema.parse(input)
  const repository =
    await createApprovalRequestRepository()
  const { data, error } = await repository.findById(
    validatedInput.companyId,
    validatedInput.approvalRequestId
  )

  if (error) {
    throw new Error(
      `Não foi possível carregar a solicitação de aprovação: ${error.message}`
    )
  }

  return data
}
