import { createServerDatabase } from "@/lib/database/server-database"

export async function createAssessmentCycleParticipantRepository() {
  const supabase = await createServerDatabase()

  return {
    async findByCycle(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase
        .from("assessment_cycle_participants")
        .select(`
          *,
          people(*)
        `)
        .eq("company_id", companyId)
        .eq("assessment_cycle_id", assessmentCycleId)
        .order("created_at", {
          ascending: true,
        })
    },

    async addParticipants(
      companyId: string,
      assessmentCycleId: string,
      employeeIds: string[]
    ) {
      return supabase.rpc("add_tenant_assessment_cycle_participants_v1", {
        p_company_id: companyId,
        p_assessment_cycle_id: assessmentCycleId,
        p_employee_ids: employeeIds,
      })
    },

    async removeParticipant(
      companyId: string,
      assessmentCycleId: string,
      employeeId: string
    ) {
      return supabase.rpc("remove_tenant_assessment_cycle_participant_v1", {
        p_company_id: companyId,
        p_assessment_cycle_id: assessmentCycleId,
        p_employee_id: employeeId,
      })
    },
  }
}
