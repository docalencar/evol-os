import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type { EmployeeStatus } from "../types/employee"

export type EmployeeHireInPeriod = {
  hireDate: string
  status: EmployeeStatus
}

type GetEmployeeHiresInPeriodInput = {
  companyId: string
  startDate: string
  endDateExclusive: string
}

export async function getEmployeeHiresInPeriod({
  companyId,
  startDate,
  endDateExclusive,
}: GetEmployeeHiresInPeriodInput): Promise<
  EmployeeHireInPeriod[]
> {
  const database = await createServerDatabase()
  const { data, error } = await database
    .from("people")
    .select("hire_date, status")
    .eq("company_id", companyId)
    .not("hire_date", "is", null)
    .gte("hire_date", startDate)
    .lt("hire_date", endDateExclusive)

  if (error) {
    throw new Error(
      "Não foi possível carregar as admissões."
    )
  }

  return (data ?? []).flatMap((employee) =>
    employee.hire_date
      ? [
          {
            hireDate: employee.hire_date,
            status: employee.status as EmployeeStatus,
          },
        ]
      : []
  )
}
