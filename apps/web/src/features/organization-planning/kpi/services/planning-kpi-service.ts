import type { KPIEvaluationApplicationService, KPIDefinitionVersion, KPIRegistry } from "../../../kpi-engine"
import type { PlanningKPIContext, PlanningKPIEvaluationResult, PlanningKPIProvider, PlanningKPISource } from "../contracts"

export class PlanningKPIService {
  constructor(
    private readonly providers: readonly PlanningKPIProvider[],
    private readonly definitions: readonly KPIDefinitionVersion[],
    private readonly registry: KPIRegistry,
    private readonly evaluationService: KPIEvaluationApplicationService
  ) {}

  register(): void {
    const missing = this.definitions.filter((item) => !this.registry.hasKey(item.key))
    if (missing.length > 0) this.registry.registerMany(missing)
  }

  snapshot(source: PlanningKPISource) {
    return Object.freeze({ source, results: Object.freeze(this.providers.flatMap((provider) => provider.calculate(source))) })
  }

  async evaluate(source: PlanningKPISource, context: PlanningKPIContext): Promise<PlanningKPIEvaluationResult> {
    this.register()
    const snapshot = this.snapshot(source)
    const evaluations = await Promise.all(this.definitions.map((definition) => this.evaluationService.evaluate({
      context: {
        companyId: context.companyId, definitionKey: definition.key,
        definitionVersion: definition.version, ownerModule: "organization-planning",
        scopeType: "scenario", scopeId: source.scenario.scenario.id,
        periodStart: context.periodStart, periodEnd: context.periodEnd,
        evaluatedAt: context.evaluatedAt, requestedBy: context.requestedBy,
        metadata: { scenarioId: source.scenario.scenario.id },
      },
      source,
    })))
    return Object.freeze({ snapshot, evaluations: Object.freeze(evaluations) })
  }
}
