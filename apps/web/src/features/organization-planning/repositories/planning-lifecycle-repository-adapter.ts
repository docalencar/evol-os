export type PlanningLifecycleTransition = "submit" | "approve" | "reject" | "revise"

export type PlanningLifecycleReadback = Readonly<{
  scenarioId: string
  status: string
  version: number
  updatedAt: string
  auditId: string
  idempotent: boolean
}>

type Database = Readonly<{
  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<Readonly<{
    data: unknown
    error: Readonly<{ message: string; code?: string }> | null
  }>>
}>

export function createPlanningLifecycleRepositoryAdapter(database: Database) {
  return {
    async transition(input: Readonly<{
      scenarioId: string
      transition: PlanningLifecycleTransition
      expectedVersion: number
      idempotencyKey: string
      reason?: string | null
    }>): Promise<PlanningLifecycleReadback> {
      const { data, error } = await database.rpc("transition_planning_scenario_v1", {
        p_scenario_id: input.scenarioId,
        p_transition: input.transition,
        p_expected_version: input.expectedVersion,
        p_idempotency_key: input.idempotencyKey,
        p_reason: input.reason ?? null,
      })
      if (error) throw new Error(error.message)
      return data as PlanningLifecycleReadback
    },

    async history(scenarioId: string) {
      const { data, error } = await database.rpc("get_planning_scenario_lifecycle_v1", {
        p_scenario_id: scenarioId,
      })
      if (error) throw new Error(error.message)
      return Array.isArray(data) ? data : []
    },
  }
}
