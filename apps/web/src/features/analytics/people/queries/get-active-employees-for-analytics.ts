import "server-only"

import { getTenantPeopleDirectory } from "@/features/dashboard-read"

export async function getActiveEmployeesForAnalytics(
  companyId: string
) {
  const people = await getTenantPeopleDirectory(companyId)

  return people
    .filter((person) => person.status === "active")
    .map((person) => ({ status: person.status }))
}
