import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

type PersonUserRow = {
  id: string
  user_id: string | null
}

type PersonManagerRow = {
  id: string
  manager_id: string | null
}

type OrganizationLeaderRow = {
  id: string
  manager_id: string | null
}

export async function createNotificationRecipientDirectoryRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findEmployeeUser(
      companyId: string,
      employeeId: string
    ) {
      return supabase
        .from("people")
        .select(`
          id,
          user_id
        `)
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .maybeSingle<PersonUserRow>()
    },

    async findEmployeeManager(
      companyId: string,
      employeeId: string
    ) {
      return supabase
        .from("people")
        .select(`
          id,
          manager_id
        `)
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .maybeSingle<PersonManagerRow>()
    },

    async findManagerUser(
      companyId: string,
      managerEmployeeId: string
    ) {
      return supabase
        .from("people")
        .select(`
          id,
          user_id
        `)
        .eq("company_id", companyId)
        .eq("id", managerEmployeeId)
        .maybeSingle<PersonUserRow>()
    },

    async findTeamLeader(
      companyId: string,
      teamId: string
    ) {
      return supabase
        .from("teams")
        .select(`
          id,
          manager_id
        `)
        .eq("company_id", companyId)
        .eq("id", teamId)
        .maybeSingle<OrganizationLeaderRow>()
    },

    async findDepartmentLeader(
      companyId: string,
      departmentId: string
    ) {
      return supabase
        .from("departments")
        .select(`
          id,
          manager_id
        `)
        .eq("company_id", companyId)
        .eq("id", departmentId)
        .maybeSingle<OrganizationLeaderRow>()
    },
  }
}
