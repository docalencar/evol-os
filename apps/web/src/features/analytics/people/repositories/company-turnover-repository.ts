import { z } from "zod"

import type { TurnoverPeriod } from "../types/turnover-analytics"

const turnoverRowSchema = z.object({
  period_kind: z.enum(["closed", "mtd"]),
  period_start: z.string().date(),
  period_end_exclusive: z.string().date(),
  availability: z.enum(["available", "unavailable"]),
  unavailable_reason: z.literal("incomplete_coverage").nullable(),
  headcount_at_start: z.number().int().nonnegative().nullable(),
  headcount_at_end: z.number().int().nonnegative().nullable(),
  headcount_as_of: z.number().int().nonnegative().nullable(),
  canonical_terminations: z.number().int().nonnegative().nullable(),
  turnover_percent: z.coerce.number().finite().nonnegative().nullable(),
  coverage_started_at: z.string().datetime({ offset: true }).nullable(),
  generated_at: z.string().datetime({ offset: true }),
  headcount_as_of_at: z.string().datetime({ offset: true }).nullable(),
}).strict()

export type TurnoverRpc = (
  name: "get_company_turnover_v1",
  parameters: Readonly<{
    p_company_id: string
    p_reason: "analytics_turnover_summary"
  }>
) => PromiseLike<Readonly<{ data: unknown; error: unknown }>>

export function createCompanyTurnoverRepository(rpc: TurnoverRpc) {
  return {
    async findCompanyTotal(
      companyId: string
    ): Promise<readonly [TurnoverPeriod, TurnoverPeriod]> {
      const { data, error } = await rpc("get_company_turnover_v1", {
        p_company_id: companyId,
        p_reason: "analytics_turnover_summary",
      })

      if (error) {
        throw new Error("TURNOVER_READ_FAILED")
      }

      return parseCompanyTurnoverRows(data)
    },
  }
}

export function parseCompanyTurnoverRows(
  data: unknown
): readonly [TurnoverPeriod, TurnoverPeriod] {
  const parsed = z.array(turnoverRowSchema).length(2).safeParse(data)

  if (!parsed.success) {
    throw new Error("TURNOVER_RESPONSE_INVALID")
  }

  const closed = parsed.data.find((row) => row.period_kind === "closed")
  const mtd = parsed.data.find((row) => row.period_kind === "mtd")

  if (!closed || !mtd) {
    throw new Error("TURNOVER_RESPONSE_INVALID")
  }

  return [mapRow(closed), mapRow(mtd)]
}

function mapRow(row: z.infer<typeof turnoverRowSchema>): TurnoverPeriod {
  return {
    periodKind: row.period_kind,
    periodStart: row.period_start,
    periodEndExclusive: row.period_end_exclusive,
    availability: row.availability,
    unavailableReason: row.unavailable_reason,
    turnoverPercent: row.turnover_percent,
    generatedAt: row.generated_at,
    headcountAsOfAt: row.headcount_as_of_at,
  }
}
