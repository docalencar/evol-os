import {
  KPIEngine,
  KPIEvaluationService,
  KPICalculatorEngine,
  KPIRegistry,
  type Clock,
  type IdGenerator,
  type KPIDefinition,
  type KPIDefinitionVersion,
  type KPIEvaluation,
  type KPIEvaluationContextInput,
} from ".."

export const january = new Date("2026-01-01T00:00:00.000Z")
export const february = new Date("2026-02-01T00:00:00.000Z")
export const march = new Date("2026-03-01T00:00:00.000Z")
export const companyId = "company-1"

export function version(
  overrides: Partial<KPIDefinitionVersion> = {},
  definitionOverrides: Partial<KPIDefinition<unknown>> = {}
): KPIDefinitionVersion {
  const definitionId = overrides.definitionId ?? "definition-1"
  const key = overrides.key ?? "test.metric"
  return {
    definitionId,
    key,
    version: overrides.version ?? 1,
    effectiveFrom: overrides.effectiveFrom ?? january,
    effectiveUntil: overrides.effectiveUntil === undefined ? null : overrides.effectiveUntil,
    active: overrides.active ?? true,
    definition: {
      id: definitionId,
      key,
      name: "Métrica de teste",
      description: "Somente infraestrutura.",
      ownerModule: "test-module",
      category: "test-category",
      valueKind: "number",
      favorableDirection: "increase",
      thresholds: [],
      target: null,
      features: { trend: false, benchmark: false, forecast: false, sla: false },
      calculate(input: unknown) {
        if (input === null || typeof input !== "object" || !("value" in input) ||
            typeof input.value !== "number") {
          throw new TypeError("Input inválido.")
        }
        return input.value
      },
      ...definitionOverrides,
    },
    ...overrides,
  }
}

export function context(
  overrides: Partial<KPIEvaluationContextInput> = {}
): KPIEvaluationContextInput {
  return {
    companyId,
    definitionKey: "test.metric",
    ownerModule: "test-module",
    scopeType: "company",
    periodStart: january,
    periodEnd: february,
    evaluatedAt: january,
    metadata: { source: "test" },
    ...overrides,
  }
}

export function evaluation(
  options: Readonly<{
    id?: string
    company?: string
    key?: string
    scopeType?: KPIEvaluationContextInput["scopeType"]
    scopeId?: string
    evaluatedAt?: Date
    createdAt?: Date
  }> = {}
): KPIEvaluation {
  const registry = new KPIRegistry()
  const item = version({ key: options.key ?? "test.metric" }, {
    key: options.key ?? "test.metric",
  })
  registry.register(item)
  const clock: Clock = { now: () => options.createdAt ?? january }
  const ids: IdGenerator = { generate: () => options.id ?? "evaluation-1" }
  return new KPIEvaluationService(
    registry,
    new KPIEngine(new KPICalculatorEngine(() => january)),
    clock,
    ids
  ).create({
    context: context({
      companyId: options.company ?? companyId,
      definitionKey: options.key ?? "test.metric",
      scopeType: options.scopeType ?? "company",
      scopeId: options.scopeId,
      evaluatedAt: options.evaluatedAt ?? january,
    }),
    source: { value: 10 },
  })
}
