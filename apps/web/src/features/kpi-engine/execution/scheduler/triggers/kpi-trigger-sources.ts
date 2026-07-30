import type { KPITriggerRequest, KPITriggerSource, KPITriggerType } from "../contracts"

abstract class TypedKPITriggerSource implements KPITriggerSource {
  constructor(private readonly type: KPITriggerType) {}
  create(input: Omit<KPITriggerRequest, "type" | "reason">): KPITriggerRequest {
    return Object.freeze({ ...input, type: this.type, reason: this.type })
  }
}
export class ManualKPITrigger extends TypedKPITriggerSource { constructor() { super("manual") } }
export class ScheduledKPITrigger extends TypedKPITriggerSource { constructor() { super("scheduled") } }
export class RetryKPITrigger extends TypedKPITriggerSource { constructor() { super("retry") } }
export class RecoveryKPITrigger extends TypedKPITriggerSource { constructor() { super("recovery") } }
export class ProviderKPITrigger extends TypedKPITriggerSource { constructor() { super("provider") } }
export class CompanyKPITrigger extends TypedKPITriggerSource { constructor() { super("company") } }
export class ScenarioKPITrigger extends TypedKPITriggerSource { constructor() { super("scenario") } }
export class FutureEventKPITrigger extends TypedKPITriggerSource { constructor() { super("future_event") } }
