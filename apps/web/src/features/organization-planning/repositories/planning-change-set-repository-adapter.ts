import type {
  ListPlanningChangeSetsInput,
  PlanningChangeSetRepository,
} from "../application"
import type { ChangeSet } from "../types/planning-contracts"
import {
  mapPlanningChangeSetRow,
  type PlanningChangeSetRow,
} from "./planning-change-set-record"

export type PlanningChangeSetDatabaseResult = Readonly<{
  data: unknown
  error: Readonly<{ message: string }> | null
}>

export interface PlanningChangeSetSelectQuery
  extends PromiseLike<PlanningChangeSetDatabaseResult> {
  eq(column: string, value: string | boolean): PlanningChangeSetSelectQuery
  is(column: string, value: null): PlanningChangeSetSelectQuery
  order(
    column: string,
    options: Readonly<{ ascending: boolean }>
  ): PlanningChangeSetSelectQuery
}

export interface PlanningChangeSetTable {
  insert(
    value: Readonly<Record<string, unknown>>
  ): PromiseLike<PlanningChangeSetDatabaseResult>
  select(columns: string): PlanningChangeSetSelectQuery
}

export interface PlanningChangeSetDatabase {
  from(table: string): PlanningChangeSetTable
}

const select = `
  id, company_id, scenario_id, change_type, payload, version
`

export function createPlanningChangeSetRepositoryAdapter(
  database: PlanningChangeSetDatabase
): PlanningChangeSetRepository {
  return {
    async create(changeSet: ChangeSet) {
      const { error } = await database
        .from("organization_planning_change_sets")
        .insert({
          id: changeSet.id,
          company_id: changeSet.companyId,
          scenario_id: changeSet.scenarioId,
          change_type: changeSet.changeType,
          payload: changeSet.payload,
          version: changeSet.version,
        })

      if (error) throw new Error(error.message)
    },

    async listPublishableByScenario(
      input: ListPlanningChangeSetsInput
    ) {
      const { data, error } = await database
        .from("organization_planning_change_sets")
        .select(select)
        .eq("company_id", input.companyId)
        .eq("scenario_id", input.scenarioId)
        .eq("active", true)
        .is("archived_at", null)
        .is("superseded_by", null)
        .order("version", { ascending: true })
        .order("id", { ascending: true })

      if (error) throw new Error(error.message)
      if (!Array.isArray(data)) {
        throw new Error("PLANNING_CHANGE_SET_INVALID_DATA")
      }

      return Object.freeze(
        data.map((row) =>
          mapPlanningChangeSetRow(row as PlanningChangeSetRow)
        )
      )
    },
  }
}
