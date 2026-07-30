import type { KPIRuntimeInvoker, KPISchedulePolicyResult } from "../contracts"
import type { KPIWorkerRuntime } from "../../runtime"

export class WorkerKPIRuntimeInvoker implements KPIRuntimeInvoker {
  constructor(private readonly runtime: KPIWorkerRuntime) {}
  async invoke(decision: KPISchedulePolicyResult) {
    if (decision.decision === "cancel") {
      if (this.runtime.getState().status === "running") await this.runtime.stop()
      return Object.freeze({ invoked: false, health: this.runtime.getHealth() })
    }
    if (decision.decision !== "execute") return Object.freeze({ invoked: false,
      health: this.runtime.getHealth() })
    const status = this.runtime.getState().status
    if (status !== "running") await this.runtime.start()
    const cycle = await this.runtime.runCycle()
    return Object.freeze({ invoked: true, cycle, health: this.runtime.getHealth() })
  }
}
