import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createSupabaseKPIEvaluationRepositoryAdapter,
  type KPIEvaluationDatabase,
} from "./supabase-kpi-evaluation-repository-adapter"

export async function createSupabaseKPIEvaluationRepository() {
  const database = await createServerDatabase()
  return createSupabaseKPIEvaluationRepositoryAdapter(
    database as unknown as KPIEvaluationDatabase
  )
}
