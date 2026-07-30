import { z } from "zod"

import { copyKPIEvaluation, type KPIEvaluation } from "../evaluations"

const thresholdSchema = z.object({
  level: z.enum(["info", "warning", "critical"]),
  operator: z.enum(["at-least", "at-most"]),
  value: z.number().finite(),
})

const definitionSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  valueKind: z.enum(["number", "percentage", "currency", "duration", "ratio"]),
  unit: z.string().nullable(),
  precision: z.number().int().nonnegative().nullable(),
  ownerModule: z.string().min(1),
  favorableDirection: z.enum(["increase", "decrease", "neutral"]),
  thresholds: z.array(thresholdSchema),
  target: z.number().finite().nullable(),
  features: z.object({
    trend: z.boolean(),
    benchmark: z.boolean(),
    forecast: z.boolean(),
    sla: z.boolean(),
  }),
})

const resultSchema = z.object({
  result: z.object({
    definitionId: z.string().min(1),
    value: z.number().finite().nullable(),
    availability: z.enum(["available", "unavailable"]),
    calculatedAt: z.string().datetime(),
  }),
  sla: z.object({
    status: z.enum(["met", "breached", "unavailable"]),
    target: z.number().finite(),
    delta: z.number().finite().nullable(),
  }).nullable(),
  trend: z.object({
    direction: z.enum(["up", "down", "stable", "unavailable"]),
    absoluteChange: z.number().finite().nullable(),
    percentageChange: z.number().finite().nullable(),
  }).nullable(),
  benchmark: z.object({
    benchmark: z.number().finite(),
    label: z.string(),
    comparison: z.enum(["above", "below", "equal", "unavailable"]),
    delta: z.number().finite().nullable(),
    percentageDifference: z.number().finite().nullable(),
  }).nullable(),
  alerts: z.array(z.object({
    id: z.string(),
    severity: z.enum(["info", "warning", "critical"]),
    message: z.string(),
  })),
  forecast: z.object({
    status: z.enum(["available", "unavailable"]),
    points: z.array(z.object({
      occurredAt: z.string().datetime(),
      value: z.number().finite(),
    })),
  }).nullable(),
})

const rowSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().min(1),
  definition_id: z.string().min(1),
  definition_key: z.string().min(1),
  definition_version: z.number().int().positive(),
  owner_module: z.string().min(1),
  scope_type: z.enum([
    "company", "department", "team", "employee", "position",
    "workspace", "scenario", "custom",
  ]),
  scope_id: z.string().nullable(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  evaluated_at: z.string().datetime(),
  requested_by: z.string().nullable(),
  correlation_id: z.string().nullable(),
  metadata: z.record(z.string(), z.json()),
  result: resultSchema,
  created_at: z.string().datetime(),
  kpi_evaluation_snapshots: z.union([
    z.object({ definition_snapshot: definitionSchema }),
    z.array(z.object({ definition_snapshot: definitionSchema })).length(1),
  ]),
})

export function mapPersistedKPIEvaluation(value: unknown): KPIEvaluation {
  const parsed = rowSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error("KPI_EVALUATION_INVALID_PERSISTED_DATA")
  }
  const row = parsed.data
  const snapshotRelation = Array.isArray(row.kpi_evaluation_snapshots)
    ? row.kpi_evaluation_snapshots[0]!
    : row.kpi_evaluation_snapshots

  return copyKPIEvaluation({
    id: row.id,
    context: {
      companyId: row.company_id,
      definitionKey: row.definition_key,
      definitionVersion: row.definition_version,
      ownerModule: row.owner_module,
      scopeType: row.scope_type,
      scopeId: row.scope_id ?? undefined,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      evaluatedAt: new Date(row.evaluated_at),
      requestedBy: row.requested_by ?? undefined,
      correlationId: row.correlation_id ?? undefined,
      metadata: row.metadata,
    },
    definition: snapshotRelation.definition_snapshot,
    definitionVersion: row.definition_version,
    result: {
      result: {
        ...row.result.result,
        calculatedAt: new Date(row.result.result.calculatedAt),
      },
      sla: row.result.sla,
      trend: row.result.trend,
      benchmark: row.result.benchmark,
      alerts: row.result.alerts,
      forecast: row.result.forecast ? {
        status: row.result.forecast.status,
        points: row.result.forecast.points.map((point) => ({
          ...point,
          occurredAt: new Date(point.occurredAt),
        })),
      } : null,
    },
    createdAt: new Date(row.created_at),
  })
}
