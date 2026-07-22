import "server-only"

import type {
  PeopleAnalyticsDashboard,
} from "../types/people-analytics-dashboard"
import { calculateHeadcount } from "../services/calculate-headcount"
import { calculateOpenJobs } from "../services/calculate-open-jobs"
import { calculateOrganizationOccupancy } from "../services/calculate-organization-occupancy"
import { calculatePendingApprovals } from "../services/calculate-pending-approvals"
import { getActiveEmployeesForAnalytics } from "./get-active-employees-for-analytics"
import { getOpenJobOpeningsForAnalytics } from "./get-open-job-openings-for-analytics"
import { getOrganizationHeadcountForAnalytics } from "./get-organization-headcount-for-analytics"
import { getPendingJobOpeningApprovalsForAnalytics } from "./get-pending-job-opening-approvals-for-analytics"

export async function getPeopleAnalyticsDashboard(
  companyId: string
): Promise<PeopleAnalyticsDashboard> {
  const [
    employees,
    openJobOpenings,
    pendingApprovals,
    headcountSnapshots,
  ] = await Promise.all([
    getActiveEmployeesForAnalytics(companyId),
    getOpenJobOpeningsForAnalytics(companyId),
    getPendingJobOpeningApprovalsForAnalytics(companyId),
    getOrganizationHeadcountForAnalytics(companyId),
  ])

  return {
    headcount: calculateHeadcount(employees),
    openJobs: calculateOpenJobs(openJobOpenings),
    pendingApprovals:
      calculatePendingApprovals(pendingApprovals),
    organizationOccupancy:
      calculateOrganizationOccupancy(headcountSnapshots),
  }
}
