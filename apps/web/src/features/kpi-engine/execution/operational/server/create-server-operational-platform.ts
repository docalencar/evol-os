import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { createServerKPIScheduler } from "../../scheduler/server"
import type { ParametersOfCreateServerWorker } from "../../scheduler/server/server-types"
import type { OperationalDatabase } from "../contracts"
import { SupabaseCoordinatorStore } from "../coordination"
import { createOperationalPlatform } from "../factories"
import { SupabasePersistentDeduplicationStore, SupabaseRateLimitStore } from "../gateway"

export async function createServerOperationalPlatform(input: ParametersOfCreateServerWorker) {
  const schedulerPlatform = await createServerKPIScheduler(input)
  const client = await createServerDatabase(); const database = client as unknown as OperationalDatabase
  const operational = createOperationalPlatform({ scheduler: schedulerPlatform.scheduler,
    clock: input.clock, idGenerator: input.idGenerator, ownerId: input.workerId ?? input.idGenerator.generate(),
    coordinatorStore: new SupabaseCoordinatorStore(database),
    deduplicationStore: new SupabasePersistentDeduplicationStore(database),
    rateLimitStore: new SupabaseRateLimitStore(database) })
  return Object.freeze({ ...operational, scheduler: schedulerPlatform.scheduler,
    workerRuntime: schedulerPlatform.workerRuntime })
}
