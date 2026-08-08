import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  CheckDevelopmentTemplateApplicationReadiness,
  createSupabaseDevelopmentTemplateApplicationResolutionRepository,
} from "../application"

export async function createServerDevelopmentTemplateReadiness() {
  const database = await createServerDatabase()
  return new CheckDevelopmentTemplateApplicationReadiness(
    createSupabaseDevelopmentTemplateApplicationResolutionRepository(database),
  )
}
