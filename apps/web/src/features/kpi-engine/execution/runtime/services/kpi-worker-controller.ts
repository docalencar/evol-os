import type { KPIWorkerCancellationToken, KPIWorkerController, KPIWorkerRuntime } from "../contracts"

export class DefaultKPIWorkerController implements KPIWorkerController {
  constructor(private readonly runtime: KPIWorkerRuntime) {}
  start() { return this.runtime.start() }
  stop() { return this.runtime.stop() }
  runCycle(token?: KPIWorkerCancellationToken) { return this.runtime.runCycle(token) }
}
