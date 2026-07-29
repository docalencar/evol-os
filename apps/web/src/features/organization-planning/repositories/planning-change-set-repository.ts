import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createPlanningChangeSetRepositoryAdapter,
  type PlanningChangeSetDatabase,
} from "./planning-change-set-repository-adapter"

export async function createPlanningChangeSetRepository() {
  const database = await createServerDatabase()
  return createPlanningChangeSetRepositoryAdapter(
    database as unknown as PlanningChangeSetDatabase
  )
}
