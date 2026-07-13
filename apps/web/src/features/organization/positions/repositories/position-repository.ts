import { createServerDatabase } from "@/lib/database/server-database"

import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../types/position"

type CreatePositionData = {
  companyId: string
  name: string
  description?: string | null
  departmentId?: string | null
  hierarchicalLevel: PositionHierarchicalLevel
  status: PositionStatus
  weeklyWorkloadHours: number
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
}

type UpdatePositionData = {
  companyId: string
  positionId: string
  name: string
  description?: string | null
  departmentId?: string | null
  hierarchicalLevel: PositionHierarchicalLevel
  status: PositionStatus
  weeklyWorkloadHours: number
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
}

export async function createPositionRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("positions")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
    },

    async findById(companyId: string, positionId: string) {
      return supabase
        .from("positions")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", positionId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreatePositionData) {
      return supabase.from("positions").insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        department_id: data.departmentId ?? null,
        hierarchical_level: data.hierarchicalLevel,
        status: data.status,
        weekly_workload_hours: data.weeklyWorkloadHours,
        work_model: data.workModel,
        employment_type: data.employmentType,
        travel_requirement: data.travelRequirement,
      })
    },

    async update(data: UpdatePositionData) {
      return supabase
        .from("positions")
        .update({
          name: data.name,
          description: data.description ?? null,
          department_id: data.departmentId ?? null,
          hierarchical_level: data.hierarchicalLevel,
          status: data.status,
          weekly_workload_hours: data.weeklyWorkloadHours,
          work_model: data.workModel,
          employment_type: data.employmentType,
          travel_requirement: data.travelRequirement,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.positionId)
        .is("deleted_at", null)
    },

    async archive(companyId: string, positionId: string) {
      return supabase
        .from("positions")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", positionId)
        .is("deleted_at", null)
    },
  }
}