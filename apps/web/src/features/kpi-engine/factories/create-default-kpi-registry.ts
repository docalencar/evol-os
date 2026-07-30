import type { KPIDefinition } from "../contracts/kpi-definition"
import { KPIRegistry, type KPIDefinitionVersion } from "../registry"

const EFFECTIVE_FROM = new Date("2026-01-01T00:00:00.000Z")

/**
 * Catálogo estritamente demonstrativo para validar a infraestrutura.
 * Estas definições não são KPIs oficiais nem representam dados de produção.
 */
export function createDefaultKPIRegistry(): KPIRegistry {
  const registry = new KPIRegistry()
  registry.registerMany([
    demoDefinition("kpi-system-health-v1", "system.health", "Saúde técnica", "percentage"),
    demoDefinition("kpi-system-latency-v1", "system.latency", "Latência técnica", "duration", "ms"),
    demoDefinition("kpi-example-percentage-v1", "example.percentage", "Percentual de exemplo", "percentage"),
    demoDefinition("kpi-example-count-v1", "example.count", "Contagem de exemplo", "number"),
  ])
  return registry
}

function demoDefinition(
  id: string,
  key: string,
  name: string,
  valueKind: KPIDefinition<unknown>["valueKind"],
  unit: string | null = null
): KPIDefinitionVersion {
  const definition: KPIDefinition<unknown> = Object.freeze({
    id,
    key,
    name,
    description: "Definição técnica de demonstração do pipeline de KPI.",
    ownerModule: "kpi-engine",
    category: key.startsWith("system.") ? "system" : "example",
    valueKind,
    unit,
    precision: valueKind === "number" ? 0 : 2,
    favorableDirection: key === "system.latency" ? "decrease" : "increase",
    thresholds: Object.freeze([]),
    target: null,
    features: Object.freeze({
      trend: true,
      benchmark: true,
      forecast: true,
      sla: true,
    }),
    calculate: readDemoValue,
  })

  return Object.freeze({
    definitionId: id,
    key,
    version: 1,
    effectiveFrom: new Date(EFFECTIVE_FROM.getTime()),
    effectiveUntil: null,
    active: true,
    definition,
  })
}

function readDemoValue(input: unknown): number | null {
  if (input === null || typeof input !== "object" || !("value" in input)) {
    throw new TypeError("O calculator demonstrativo exige um campo value.")
  }
  const value = input.value
  if (value === null) return null
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError("O campo value deve ser numérico e finito.")
  }
  return value
}
