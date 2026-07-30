import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { Clock, IdGenerator } from "../.."
import type { KPIExecutionExecutor, KPIExecutionTelemetry } from "../contracts"
import { createKPIExecutionPlatform } from "../factories"
import { DurableKPIExecutionPolicy } from "../policies"
import {
  SupabaseKPIExecutionAttemptRepository, SupabaseKPIExecutionRepository,
  type KPIExecutionDatabase,
} from "../repositories"
import { NoopKPIExecutionTelemetry } from "../telemetry"

export async function createDurableKPIExecutionPlatform(input: Readonly<{
  companyId: string
  executors: readonly KPIExecutionExecutor[]
  clock: Clock
  idGenerator: IdGenerator
  telemetry?: KPIExecutionTelemetry
}>) {
  const client = await createServerDatabase()
  const database = client as unknown as KPIExecutionDatabase
  const executions = new SupabaseKPIExecutionRepository(database)
  const attempts = new SupabaseKPIExecutionAttemptRepository(database, input.companyId)
  const policy = new DurableKPIExecutionPolicy(executions, attempts, input.clock, input.idGenerator, executions)
  return createKPIExecutionPlatform({ executors: input.executors, clock: input.clock,
    idGenerator: input.idGenerator, policy,
    telemetry: input.telemetry ?? new NoopKPIExecutionTelemetry() })
}
