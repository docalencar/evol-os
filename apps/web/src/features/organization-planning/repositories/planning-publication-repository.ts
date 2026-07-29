import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createPlanningPublicationRepositoryAdapter,
  type PlanningPublicationDatabase,
} from "./planning-publication-repository-adapter"

export async function createPlanningPublicationRepository() {
  const database = await createServerDatabase()
  return createPlanningPublicationRepositoryAdapter(
    database as unknown as PlanningPublicationDatabase
  )
}
