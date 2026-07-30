import type { KPIWorkerWorkPriority, KPIWorkerWorkType } from "../contracts"

const PRIORITIES: Readonly<Record<KPIWorkerWorkType, number>> = Object.freeze({
  recovery_execution: 1, retry_execution: 2, pending_execution: 3,
})
export class DefaultKPIWorkerWorkPriority implements KPIWorkerWorkPriority {
  priority(type: KPIWorkerWorkType): number { return PRIORITIES[type] }
}
