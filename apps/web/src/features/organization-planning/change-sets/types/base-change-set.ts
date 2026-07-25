import type { PlanningChangeType } from "../constants/change-types"

export type PlanningChangeSetPayload = Record<string, unknown>

export type BasePlanningChangeSet<
  TChangeType extends PlanningChangeType,
  TPayload extends PlanningChangeSetPayload,
> = {
  id: string
  companyId: string
  scenarioId: string
  changeType: TChangeType
  payload: TPayload
  version: number
  createdAt: string
  updatedAt: string
}

export type CreateBasePlanningChangeSetInput<
  TChangeType extends PlanningChangeType,
  TPayload extends PlanningChangeSetPayload,
> = {
  id?: string
  companyId: string
  scenarioId: string
  changeType: TChangeType
  payload: TPayload
}

export type UpdateBasePlanningChangeSetInput<
  TPayload extends PlanningChangeSetPayload,
> = {
  payload: TPayload
  expectedVersion: number
}

export type PersistedPlanningChangeSetRecord = {
  id: string
  company_id: string
  scenario_id: string
  change_type: string
  payload: PlanningChangeSetPayload
  version: number
  created_at: string
  updated_at: string
}
