import "server-only"

import { z } from "zod"

import { createLeadershipAttentionRepository } from "../repositories/leadership-attention-repository"
import type { AttentionItem } from "../types/attention-item"

export async function getAttentionQueue(
  companyId: string
): Promise<AttentionItem[]> {
  const parsedCompanyId = z.string().uuid().safeParse(companyId)

  if (!parsedCompanyId.success) {
    throw new Error("LEADERSHIP_ATTENTION_INVALID_COMPANY")
  }

  const repository = await createLeadershipAttentionRepository()

  return repository.findForCurrentManager(parsedCompanyId.data)
}
