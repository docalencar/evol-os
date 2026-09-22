import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { createPlanningLifecycleRepositoryAdapter } from "./planning-lifecycle-repository-adapter"

export type { PlanningLifecycleReadback } from "./planning-lifecycle-repository-adapter"

export async function createPlanningLifecycleRepository() {
  return createPlanningLifecycleRepositoryAdapter(await createServerDatabase())
}
