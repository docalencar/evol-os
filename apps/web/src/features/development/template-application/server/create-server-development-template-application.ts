import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  ApplyDevelopmentTemplateApplicationService,
  createSupabaseDevelopmentTemplateApplicationResolutionRepository,
} from "../application"
import { createSupabaseTrustedTemplateApplicationPersistence } from "../trusted-persistence"

function createTrustedDatabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("DEVELOPMENT_TEMPLATE_TRUSTED_DATABASE_NOT_CONFIGURED")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function createServerDevelopmentTemplateApplication() {
  const database = await createServerDatabase()
  return new ApplyDevelopmentTemplateApplicationService(
    createSupabaseDevelopmentTemplateApplicationResolutionRepository(database),
    createSupabaseTrustedTemplateApplicationPersistence(createTrustedDatabase()),
  )
}
