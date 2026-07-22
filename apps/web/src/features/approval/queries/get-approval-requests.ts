import "server-only"

import { z } from "zod"

import {
  APPROVAL_REQUEST_STATUSES,
} from "../domain"
import {
  createApprovalRequestRepository,
} from "../repositories"

const getApprovalRequestsSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(APPROVAL_REQUEST_STATUSES).optional(),
  module: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
})

export type GetApprovalRequestsInput = z.input<
  typeof getApprovalRequestsSchema
>

export async function getApprovalRequests(
  input: GetApprovalRequestsInput
) {
  const validatedInput =
    getApprovalRequestsSchema.parse(input)
  const repository =
    await createApprovalRequestRepository()
  const { data, error } = await repository.findAll(
    validatedInput
  )

  if (error) {
    throw new Error(
      `Não foi possível carregar as solicitações de aprovação: ${error.message}`
    )
  }

  return data
}
