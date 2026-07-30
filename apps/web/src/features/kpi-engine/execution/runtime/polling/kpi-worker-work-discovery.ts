import type { ExecutionLeaseRepository } from "../../leases"
import type { KPIExecutionRepository } from "../../repositories"
import type { KPIWorkerWorkDiscovery, KPIWorkerWorkItem, KPIWorkerWorkPriority } from "../contracts"
import { KPIWorkerError } from "../domain"

export class RepositoryKPIWorkerWorkDiscovery implements KPIWorkerWorkDiscovery {
  constructor(private readonly executions: KPIExecutionRepository,
    private readonly leases: ExecutionLeaseRepository,
    private readonly priority: KPIWorkerWorkPriority) {}
  async discover(input: Parameters<KPIWorkerWorkDiscovery["discover"]>[0]) {
    try {
      const [recoveries, retries, pending] = await Promise.all([
        this.leases.listExpiredRunning(input.companyId, input.at,
          { limit: input.maxRecoveries, offset: input.page.offset }),
        this.executions.list({ companyId: input.companyId, providerKey: input.providerKey,
          status: "failed", page: { limit: input.maxRetries, offset: input.page.offset } }),
        this.executions.list({ companyId: input.companyId, providerKey: input.providerKey,
          status: "pending", page: { limit: input.maxPending, offset: input.page.offset } }),
      ])
      const items: KPIWorkerWorkItem[] = [
        ...recoveries.map((execution) => item("recovery_execution", execution, this.priority)),
        ...retries.map((execution) => item("retry_execution", execution, this.priority)),
        ...pending.map((execution) => item("pending_execution", execution, this.priority)),
      ]
      return Object.freeze(items.sort((left, right) => left.priority - right.priority ||
        left.execution.createdAt.getTime() - right.execution.createdAt.getTime() ||
        left.execution.id.localeCompare(right.execution.id)).slice(0, input.page.limit))
    } catch (cause) {
      throw new KPIWorkerError("WORK_DISCOVERY_FAILURE", "Falha ao descobrir trabalho.", { cause })
    }
  }
}
function item(type: KPIWorkerWorkItem["type"], execution: KPIWorkerWorkItem["execution"],
  priority: KPIWorkerWorkPriority): KPIWorkerWorkItem {
  return Object.freeze({ type, execution, priority: priority.priority(type) })
}
