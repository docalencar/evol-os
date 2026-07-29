import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createPlanningBaselineRepositoryAdapter,
  type PlanningBaselineDatabase,
} from "./planning-baseline-repository-adapter"

export async function createPlanningBaselineRepository() {
  const database = await createServerDatabase()
  return createPlanningBaselineRepositoryAdapter(
    database as unknown as PlanningBaselineDatabase
  )
}
