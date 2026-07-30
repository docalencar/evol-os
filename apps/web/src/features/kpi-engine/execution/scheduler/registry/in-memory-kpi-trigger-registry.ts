import type { KPITrigger, KPITriggerRegistry, KPITriggerType, KPISchedulerTelemetry } from "../contracts"
import { KPISchedulerError } from "../domain"

export class InMemoryKPITriggerRegistry implements KPITriggerRegistry {
  private readonly triggers = new Map<string, KPITrigger>()
  constructor(private readonly telemetry?: KPISchedulerTelemetry) {}
  register(trigger: KPITrigger): void {
    if (!trigger.id.trim()) throw new KPISchedulerError("INVALID_TRIGGER", "Trigger sem identificador.")
    if (this.triggers.has(trigger.id)) throw new KPISchedulerError("DUPLICATE_TRIGGER", "Trigger duplicado.")
    this.triggers.set(trigger.id, Object.freeze({ ...trigger })); void this.telemetry?.record({
      kind: "trigger_registered", triggerId: trigger.id, companyId: trigger.companyId,
      providerKey: trigger.providerKey })
  }
  enable(id: string): void { this.replace(id, true) }
  disable(id: string): void { this.replace(id, false) }
  resolveById(id: string): KPITrigger | null { return this.triggers.get(id) ?? null }
  resolveByType(type: KPITriggerType): readonly KPITrigger[] { return this.filter((item) => item.type === type) }
  resolveByProvider(providerKey: string): readonly KPITrigger[] {
    return this.filter((item) => item.providerKey === providerKey)
  }
  resolveByCompany(companyId: string): readonly KPITrigger[] {
    return this.filter((item) => item.companyId === companyId)
  }
  list(): readonly KPITrigger[] { return Object.freeze([...this.triggers.values()].sort(compareTriggers)) }
  private filter(predicate: (trigger: KPITrigger) => boolean): readonly KPITrigger[] {
    return Object.freeze(this.list().filter(predicate))
  }
  private replace(id: string, enabled: boolean): void {
    const trigger = this.triggers.get(id)
    if (!trigger) throw new KPISchedulerError("TRIGGER_NOT_FOUND", "Trigger não encontrado.")
    this.triggers.set(id, Object.freeze({ ...trigger, enabled }))
  }
}
const defaultPriority: Readonly<Record<KPITriggerType, number>> = Object.freeze({ recovery: 800,
  retry: 700, manual: 600, scheduled: 500, scenario: 400, provider: 300, future_event: 200,
  company: 100 })
function compareTriggers(left: KPITrigger, right: KPITrigger): number {
  return (right.priority ?? defaultPriority[right.type]) - (left.priority ?? defaultPriority[left.type]) ||
    left.id.localeCompare(right.id)
}
