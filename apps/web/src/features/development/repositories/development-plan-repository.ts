import { createServerDatabase } from "@/lib/database/server-database"

import type {
  DevelopmentPlan,
} from "../types/development-plan"

type DevelopmentPlanRow = {
  id: string
  company_id: string
  employee_id: string
  owner_id: string | null
  template_id: string | null
  title: string
  description: string | null
  status: DevelopmentPlan["status"]
  priority: DevelopmentPlan["priority"]
  created_by: string
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type CreateDevelopmentPlanInput = {
  companyId: string
  employeeId: string
  ownerId?: string
  templateId?: string
  title: string
  description?: string
  priority: DevelopmentPlan["priority"]
  createdBy: string
  startDate?: string
  dueDate?: string
}

type UpdateDevelopmentPlanInput = {
  title: string
  description?: string
  ownerId?: string
  priority: DevelopmentPlan["priority"]
  startDate?: string
  dueDate?: string
}

type UpdateDevelopmentPlanStatusInput = {
  status: DevelopmentPlan["status"]
  completedAt: string | null
}

function mapDevelopmentPlan(
  row: DevelopmentPlanRow
): DevelopmentPlan {
  return {
    id: row.id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    ownerId: row.owner_id,
    templateId: row.template_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    startDate: row.start_date,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createDevelopmentPlanRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findAllByCompany(
      companyId: string
    ) {
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        })

      return {
        data: data
          ? data.map((row) =>
              mapDevelopmentPlan(
                row as DevelopmentPlanRow
              )
            )
          : null,
        error,
      }
    },

    async findByEmployee(
      companyId: string,
      employeeId: string
    ) {
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .order("created_at", {
          ascending: false,
        })

      return {
        data: data
          ? data.map((row) =>
              mapDevelopmentPlan(
                row as DevelopmentPlanRow
              )
            )
          : null,
        error,
      }
    },

    async findById(
      companyId: string,
      planId: string
    ) {
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", planId)
        .maybeSingle()

      return {
        data: data
          ? mapDevelopmentPlan(
              data as DevelopmentPlanRow
            )
          : null,
        error,
      }
    },

    async create(
      input: CreateDevelopmentPlanInput
    ) {
      const { data, error } =
        await supabase
          .from("development_plans")
          .insert({
            company_id: input.companyId,
            employee_id: input.employeeId,
            owner_id:
              input.ownerId ?? null,
            template_id:
              input.templateId ?? null,
            title: input.title,
            description:
              input.description ?? null,
            priority: input.priority,
            created_by: input.createdBy,
            start_date:
              input.startDate ?? null,
            due_date:
              input.dueDate ?? null,
            status: "draft",
            updated_at:
              new Date().toISOString(),
          })
          .select("*")
          .single()

      return {
        data: data
          ? mapDevelopmentPlan(
              data as DevelopmentPlanRow
            )
          : null,
        error,
      }
    },

    async update(
      companyId: string,
      planId: string,
      input: UpdateDevelopmentPlanInput
    ) {
      const { data, error } =
        await supabase
          .from("development_plans")
          .update({
            title: input.title,
            description:
              input.description ?? null,
            owner_id:
              input.ownerId || null,
            priority: input.priority,
            start_date:
              input.startDate || null,
            due_date:
              input.dueDate || null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("id", planId)
          .select("*")
          .single()

      return {
        data: data
          ? mapDevelopmentPlan(
              data as DevelopmentPlanRow
            )
          : null,
        error,
      }
    },

    async updateStatus(
      companyId: string,
      planId: string,
      input: UpdateDevelopmentPlanStatusInput
    ) {
      const { data, error } =
        await supabase
          .from("development_plans")
          .update({
            status: input.status,
            completed_at:
              input.completedAt,
            updated_at:
              new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("id", planId)
          .select("*")
          .single()

      return {
        data: data
          ? mapDevelopmentPlan(
              data as DevelopmentPlanRow
            )
          : null,
        error,
      }
    },
  }
}