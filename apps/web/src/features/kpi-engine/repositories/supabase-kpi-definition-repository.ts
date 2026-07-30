import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { KPIDefinitionCalculatorResolver } from "./kpi-definition-persistence-record"
import {
  createSupabaseKPIDefinitionRepositoryAdapter,
  type KPIDefinitionDatabase,
} from "./supabase-kpi-definition-repository-adapter"

export async function createSupabaseKPIDefinitionRepository(
  companyId: string,
  calculatorResolver: KPIDefinitionCalculatorResolver
) {
  const database = await createServerDatabase()
  return createSupabaseKPIDefinitionRepositoryAdapter(
    database as unknown as KPIDefinitionDatabase,
    companyId,
    calculatorResolver
  )
}
