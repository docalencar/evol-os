import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createLeadershipAttentionRepositoryAdapter,
  type LeadershipAttentionDatabase,
} from "./leadership-attention-repository-adapter"

export async function createLeadershipAttentionRepository() {
  const database = await createServerDatabase()

  return createLeadershipAttentionRepositoryAdapter(
    database as unknown as LeadershipAttentionDatabase
  )
}
