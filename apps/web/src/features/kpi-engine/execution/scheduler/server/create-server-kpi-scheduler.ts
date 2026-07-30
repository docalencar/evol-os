import "server-only"

import type { ParametersOfCreateServerWorker } from "./server-types"
import { createServerKPIWorkerRuntime } from "../../runtime/factories/create-server-kpi-worker-runtime"
import { createKPIScheduler } from "../factories"
import { WorkerKPIRuntimeInvoker } from "../runtime"

export async function createServerKPIScheduler(input: ParametersOfCreateServerWorker) {
  const worker = await createServerKPIWorkerRuntime(input)
  const platform = createKPIScheduler({ clock: input.clock, idGenerator: input.idGenerator,
    invoker: new WorkerKPIRuntimeInvoker(worker.runtime) })
  return Object.freeze({ ...platform, workerRuntime: worker.runtime,
    workerMetrics: worker.metrics, workerTelemetry: worker.telemetry })
}
