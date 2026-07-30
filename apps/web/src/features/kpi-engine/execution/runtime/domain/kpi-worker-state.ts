import type { KPIWorkerRuntimeState, KPIWorkerRuntimeStatus } from "../contracts"
import { KPIWorkerError } from "./kpi-worker-error"

export function createKPIWorkerRuntimeState(): KPIWorkerRuntimeState {
  return Object.freeze({ status: "idle", startedAt: null, stoppedAt: null, failedAt: null,
    lastCycleAt: null, lastSuccessfulCycleAt: null, consecutiveFailures: 0,
    consecutiveEmptyCycles: 0, cycleRunning: false })
}
export function transitionKPIWorkerState(state: KPIWorkerRuntimeState,
  status: KPIWorkerRuntimeStatus, at: Date): KPIWorkerRuntimeState {
  const allowed: Readonly<Record<KPIWorkerRuntimeStatus, readonly KPIWorkerRuntimeStatus[]>> = {
    idle: ["starting"], starting: ["running", "failed"], running: ["stopping", "failed"],
    stopping: ["stopped"], stopped: ["starting"], failed: ["starting"],
  }
  if (!allowed[state.status].includes(status)) throw new KPIWorkerError("INVALID_RUNTIME_TRANSITION",
    `Transição inválida: ${state.status} → ${status}.`)
  return Object.freeze({ ...state, status,
    startedAt: status === "running" ? at : state.startedAt,
    stoppedAt: status === "stopped" ? at : state.stoppedAt,
    failedAt: status === "failed" ? at : state.failedAt })
}
