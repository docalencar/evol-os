import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { TenantAccessApplicationService } from "../application"
import { createSupabaseTenantAccessTrustedPersistence } from "../trusted-persistence"

export async function createServerTenantAccessApplication(): Promise<TenantAccessApplicationService> {
  const authenticatedDatabase = await createServerDatabase()
  const persistence = createSupabaseTenantAccessTrustedPersistence(authenticatedDatabase)
  return new TenantAccessApplicationService(persistence)
}
