import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

type EmployeeUserRow = {
  id: string
  user_id: string | null
}

type EmployeeManagerRow = {
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
        .from("employees")
        .select(`
          id,
          user_id
        `)
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .maybeSingle<EmployeeUserRow>()
    },

    async findEmployeeManager(
      companyId: string,
      employeeId: string
    ) {
      return supabase
        .from("employees")
        .select(`
          id,
          manager_id
        `)
        .eq("company_id", companyId)
        .eq("id", employeeId)
        .maybeSingle<EmployeeManagerRow>()
    },

    async findManagerUser(
      companyId: string,
      managerEmployeeId: string
    ) {
      return supabase
        .from("employees")
        .select(`
          id,
          user_id
        `)
        .eq("company_id", companyId)
        .eq("id", managerEmployeeId)
        .maybeSingle<EmployeeUserRow>()
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
