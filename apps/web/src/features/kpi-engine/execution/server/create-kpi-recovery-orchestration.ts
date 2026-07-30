import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { Clock, IdGenerator } from "../.."
import type { KPIExecutionTelemetry } from "../contracts"
import { createKPIRecoveryOrchestration } from "../factories"
import { SupabaseExecutionLeaseRepository } from "../leases"
import type { KPIRetryPolicy } from "../policies"
import type { KPIRecoveryRequestResolver } from "../recovery"
import type { KPIExecutionDatabase } from "../repositories"
import type { KPIExecutionPlatform } from "../services"

export async function createServerKPIRecoveryOrchestration(input: Readonly<{
  platform: KPIExecutionPlatform; retryPolicy: KPIRetryPolicy
  requestResolver: KPIRecoveryRequestResolver; telemetry: KPIExecutionTelemetry
  clock: Clock; idGenerator: IdGenerator; ownerId: string; leaseDurationMs: number
}>) {
  const client = await createServerDatabase()
  const leases = new SupabaseExecutionLeaseRepository(
    client as unknown as KPIExecutionDatabase, input.clock)
  return createKPIRecoveryOrchestration({ ...input, leases })
}
