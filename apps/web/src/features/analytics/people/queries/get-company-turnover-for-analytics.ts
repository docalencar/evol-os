import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createCompanyTurnoverRepository,
  type TurnoverRpc,
} from "../repositories/company-turnover-repository"
import type { TurnoverAnalytics } from "../types/turnover-analytics"

export async function getCompanyTurnoverForAnalytics(
  companyId: string,
  rpc?: TurnoverRpc
): Promise<TurnoverAnalytics> {
  try {
    const database = rpc
      ? null
      : await createServerDatabase()
    const execute = (rpc ?? database!.rpc.bind(database)) as TurnoverRpc
    const repository = createCompanyTurnoverRepository(execute)

    return {
      status: "available",
      periods: await repository.findCompanyTotal(companyId),
    }
  } catch (error) {
    console.error("[people-analytics] turnover load failed", error)
    return { status: "unavailable", reason: "query_error" }
  }
}
