import { createServerDatabase } from "@/lib/database/server-database"
import type { DevelopmentPlan } from "../types/development-plan"

type DevelopmentPlanRow = {
  plan_id: string; employee_id: string; owner_id: string | null; template_id: string | null
  title: string; description: string | null; status: DevelopmentPlan["status"]
  priority: DevelopmentPlan["priority"]; start_date: string | null; due_date: string | null
  completed_at: string | null; version: number; total_actions: number; completed_actions: number
  skipped_actions: number; progress_percent: number; created_at: string; updated_at: string
}
type CreateDevelopmentPlanInput = {
  companyId: string; employeeId: string; ownerId?: string; templateId?: string; title: string
  description?: string; priority: DevelopmentPlan["priority"]; createdBy: string; startDate?: string; dueDate?: string
}
type UpdateDevelopmentPlanInput = {
  title: string; description?: string; ownerId?: string; priority: DevelopmentPlan["priority"]
  startDate?: string; dueDate?: string
}

export function mapDevelopmentPlan(row: DevelopmentPlanRow, companyId: string): DevelopmentPlan {
  return {
    id: row.plan_id, companyId, employeeId: row.employee_id, ownerId: row.owner_id,
    templateId: row.template_id, title: row.title, description: row.description,
    status: row.status, priority: row.priority, startDate: row.start_date,
    dueDate: row.due_date, completedAt: row.completed_at, createdAt: row.created_at,
    updatedAt: row.updated_at, version: row.version,
    totalActions: row.total_actions, completedActions: row.completed_actions,
    skippedActions: row.skipped_actions, progressPercent: row.progress_percent,
  }
}

export async function createDevelopmentPlanRepository() {
  const supabase = await createServerDatabase()
  // The boundary returns rows, not a typed relation: the client has no generated
  // Database types, so `rpc` widens `data` to `any`. Narrowing here once — rather
  // than casting at each call site — is what keeps the mapping callbacks typed
  // and `noImplicitAny` satisfied downstream.
  async function read(
    companyId: string,
    planId: string | null
  ): Promise<{ data: DevelopmentPlanRow[] | null; error: unknown }> {
    const { data, error } = await supabase.rpc("get_authorized_development_plans_v1", {
      p_company_id: companyId,
      p_plan_id: planId,
    })
    return { data: (data ?? null) as DevelopmentPlanRow[] | null, error }
  }
  async function findById(companyId: string, planId: string) {
    const { data, error } = await read(companyId, planId)
    const row = data?.[0]
    return { data: row ? mapDevelopmentPlan(row, companyId) : null, error }
  }
  return {
    async findAllByCompany(companyId: string) {
      const { data, error } = await read(companyId, null)
      return { data: data?.map((row) => mapDevelopmentPlan(row, companyId)) ?? null, error }
    },
    async findByEmployee(companyId: string, employeeId: string) {
      const { data, error } = await read(companyId, null)
      return {
        data:
          data
            ?.filter((row) => row.employee_id === employeeId)
            .map((row) => mapDevelopmentPlan(row, companyId)) ?? null,
        error,
      }
    },
    findById,
    async create(input: CreateDevelopmentPlanInput) {
      const { data, error } = await supabase.rpc("create_development_plan_v1", {
        p_employee_id: input.employeeId, p_owner_id: input.ownerId ?? null, p_title: input.title,
        p_description: input.description ?? null, p_priority: input.priority,
        p_start_date: input.startDate ?? null, p_due_date: input.dueDate ?? null,
        p_idempotency_key: crypto.randomUUID(),
      })
      const planId = (data as { planId?: string } | null)?.planId
      if (error || !planId) return { data: null, error }
      return findById(input.companyId, planId)
    },
    async update(companyId: string, planId: string, input: UpdateDevelopmentPlanInput) {
      const current = await findById(companyId, planId)
      if (current.error || !current.data) return current
      let version = current.data.version ?? 1
      if (input.ownerId && input.ownerId !== current.data.ownerId) {
        const reassignment = await supabase.rpc("reassign_development_plan_owner_v1", {
          p_plan_id: planId, p_new_owner_id: input.ownerId, p_expected_version: version,
        })
        if (reassignment.error) return { data: null, error: reassignment.error }
        version += 1
      }
      const { error } = await supabase.rpc("update_development_plan_v1", {
        p_plan_id: planId, p_expected_version: version, p_title: input.title,
        p_description: input.description ?? null, p_priority: input.priority,
        p_start_date: input.startDate || null, p_due_date: input.dueDate || null,
      })
      if (error) return { data: null, error }
      return findById(companyId, planId)
    },
    async activate(companyId: string, planId: string) {
      const current = await findById(companyId, planId)
      if (current.error || !current.data) return current
      const parameters = { p_plan_id: planId, p_expected_version: current.data.version ?? 1 }
      const { error } = await supabase.rpc("activate_development_plan_v1", parameters)
      if (error) return { data: null, error }
      return findById(companyId, planId)
    },
    async complete(companyId: string, planId: string) {
      const current = await findById(companyId, planId)
      if (current.error || !current.data) return current
      const parameters = { p_plan_id: planId, p_expected_version: current.data.version ?? 1 }
      const { error } = await supabase.rpc("complete_development_plan_v1", parameters)
      if (error) return { data: null, error }
      return findById(companyId, planId)
    },
  }
}
