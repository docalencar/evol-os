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
      return supabase
        .from("assessment_cycle_participants")
        .insert(
          employeeIds.map((employeeId) => ({
            company_id: companyId,
            assessment_cycle_id: assessmentCycleId,
            employee_id: employeeId,
          }))
        )
    },

    async removeParticipant(
      companyId: string,
      assessmentCycleId: string,
      employeeId: string
    ) {
      return supabase
        .from("assessment_cycle_participants")
        .delete()
        .eq("company_id", companyId)
        .eq("assessment_cycle_id", assessmentCycleId)
        .eq("employee_id", employeeId)
    },
  }
}
