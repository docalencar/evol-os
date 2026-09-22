import type {
  CreatePlanningChangeSetInput,
  ListPlanningChangeSetsInput,
  PlanningChangeSetMutationRepository,
  RemovePlanningChangeSetInput,
  ReorderPlanningChangeSetsInput,
  ReplacePlanningChangeSetInput,
} from "../application"
import {
  mapPlanningChangeSetRow,
  type PlanningChangeSetRow,
} from "./planning-change-set-record"

export interface PlanningChangeSetDatabase {
  rpc(
    name: string,
    parameters: Readonly<Record<string, unknown>>
  ): PromiseLike<Readonly<{
    data: unknown
    error: Readonly<{ message: string }> | null
  }>>
}

export function createPlanningChangeSetRepositoryAdapter(
  database: PlanningChangeSetDatabase
): PlanningChangeSetMutationRepository {
  async function rpc(
    name: string,
    parameters: Readonly<Record<string, unknown>>
  ): Promise<unknown> {
    const { data, error } = await database.rpc(name, parameters)
    if (error) throw new Error(error.message)
    if (name !== "get_planning_change_sets_v1" && !isObject(data)) {
      throw new Error("PLANNING_CHANGE_SET_INVALID_DATA")
    }
    return data
  }

  return {
    async createTrusted(input: CreatePlanningChangeSetInput) {
      await rpc("create_planning_change_set_v1", {
        p_scenario_id: input.scenarioId,
        p_expected_version: input.expectedVersion,
        p_change_set_id: input.changeSetId,
        p_change_type: input.changeType,
        p_payload: input.payload,
      })
    },

    async replaceTrusted(input: ReplacePlanningChangeSetInput) {
      await rpc("replace_planning_change_set_v1", {
        p_scenario_id: input.scenarioId,
        p_expected_version: input.expectedVersion,
        p_change_set_id: input.currentChangeSetId,
        p_replacement_id: input.changeSetId,
        p_change_type: input.changeType,
        p_payload: input.payload,
      })
    },

    async removeTrusted(input: RemovePlanningChangeSetInput) {
      await rpc("remove_planning_change_set_v1", {
        p_scenario_id: input.scenarioId,
        p_expected_version: input.expectedVersion,
        p_change_set_id: input.changeSetId,
      })
    },

    async reorderTrusted(input: ReorderPlanningChangeSetsInput) {
      await rpc("reorder_planning_change_sets_v1", {
        p_scenario_id: input.scenarioId,
        p_expected_version: input.expectedVersion,
        p_ordered_change_set_ids: input.orderedChangeSetIds,
      })
    },

    async listPublishableByScenario(input: ListPlanningChangeSetsInput) {
      const data = await rpc("get_planning_change_sets_v1", {
        p_scenario_id: input.scenarioId,
      })
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

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
