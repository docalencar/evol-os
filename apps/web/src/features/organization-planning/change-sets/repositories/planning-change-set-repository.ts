import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  type CreateBasePlanningChangeSetInput,
  type PersistedPlanningChangeSetRecord,
  type PlanningChangeSet,
  type PlanningChangeSetPayload,
  type PlanningChangeType,
  type UpdateBasePlanningChangeSetInput,
} from "../index"
import { parsePlanningChangeSet } from "../mappers/parse-planning-change-set"

const CHANGE_SET_SELECT = `
  id,
  company_id,
  scenario_id,
  change_type,
  payload,
  version,
  created_at,
  updated_at
`

type CreatePlanningChangeSetInput<
  TChangeType extends PlanningChangeType = PlanningChangeType,
> = CreateBasePlanningChangeSetInput<
  TChangeType,
  PlanningChangeSetPayload<TChangeType>
>

type UpdatePlanningChangeSetInput<
  TChangeType extends PlanningChangeType = PlanningChangeType,
> = UpdateBasePlanningChangeSetInput<
  PlanningChangeSetPayload<TChangeType>
>

function mapPlanningChangeSet(
  row: PersistedPlanningChangeSetRecord
): PlanningChangeSet {
  return parsePlanningChangeSet(row)
}

export async function createPlanningChangeSetRepository() {
  const database = await createServerDatabase()

  return {
    async findById(
      companyId: string,
      changeSetId: string
    ): Promise<PlanningChangeSet | null> {
      const { data, error } = await database
        .from("organization_planning_change_sets")
        .select(CHANGE_SET_SELECT)
        .eq("company_id", companyId)
        .eq("id", changeSetId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data
        ? mapPlanningChangeSet(
            data as PersistedPlanningChangeSetRecord
          )
        : null
    },

    async findByScenario(
      companyId: string,
      scenarioId: string
    ): Promise<PlanningChangeSet[]> {
      const { data, error } = await database
        .from("organization_planning_change_sets")
        .select(CHANGE_SET_SELECT)
        .eq("company_id", companyId)
        .eq("scenario_id", scenarioId)
        .order("version", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map((row) =>
        mapPlanningChangeSet(
          row as PersistedPlanningChangeSetRecord
        )
      )
    },

    async create<TChangeType extends PlanningChangeType>(
      input: CreatePlanningChangeSetInput<TChangeType>
    ): Promise<PlanningChangeSet> {
      const id = input.id ?? crypto.randomUUID()
      const now = new Date().toISOString()

      const { data, error } = await database
        .from("organization_planning_change_sets")
        .insert({
          id,
          company_id: input.companyId,
          scenario_id: input.scenarioId,
          change_type: input.changeType,
          payload: input.payload,
          version: 1,
          created_at: now,
          updated_at: now,
        })
        .select(CHANGE_SET_SELECT)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return mapPlanningChangeSet(
        data as PersistedPlanningChangeSetRecord
      )
    },

    async createMany(
      inputs: readonly CreatePlanningChangeSetInput[]
    ): Promise<PlanningChangeSet[]> {
      if (inputs.length === 0) {
        return []
      }

      const now = new Date().toISOString()

      const rows = inputs.map((input) => ({
        id: input.id ?? crypto.randomUUID(),
        company_id: input.companyId,
        scenario_id: input.scenarioId,
        change_type: input.changeType,
        payload: input.payload,
        version: 1,
        created_at: now,
        updated_at: now,
      }))

      const { data, error } = await database
        .from("organization_planning_change_sets")
        .insert(rows)
        .select(CHANGE_SET_SELECT)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? [])
        .map((row) =>
          mapPlanningChangeSet(
            row as PersistedPlanningChangeSetRecord
          )
        )
        .sort((left, right) => {
          if (left.version !== right.version) {
            return left.version - right.version
          }

          const createdAtComparison =
            left.createdAt.localeCompare(right.createdAt)

          if (createdAtComparison !== 0) {
            return createdAtComparison
          }

          return left.id.localeCompare(right.id)
        })
    },

    async update<TChangeType extends PlanningChangeType>(
      companyId: string,
      changeSetId: string,
      input: UpdatePlanningChangeSetInput<TChangeType>
    ): Promise<PlanningChangeSet> {
      const nextVersion = input.expectedVersion + 1

      const { data, error } = await database
        .from("organization_planning_change_sets")
        .update({
          payload: input.payload,
          version: nextVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", changeSetId)
        .eq("version", input.expectedVersion)
        .select(CHANGE_SET_SELECT)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error("PLANNING_CHANGE_SET_VERSION_CONFLICT")
      }

      return mapPlanningChangeSet(
        data as PersistedPlanningChangeSetRecord
      )
    },

    async delete(
      companyId: string,
      changeSetId: string
    ): Promise<void> {
      const { error } = await database
        .from("organization_planning_change_sets")
        .delete()
        .eq("company_id", companyId)
        .eq("id", changeSetId)

      if (error) {
        throw new Error(error.message)
      }
    },
  }
}

export type PlanningChangeSetRepository = Awaited<
  ReturnType<typeof createPlanningChangeSetRepository>
>
