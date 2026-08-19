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

// Each indicator loads independently so a single failing read degrades to a
// neutral empty/zero state instead of taking the whole dashboard down. The
// reads themselves go through tenant-safe boundaries; this is defense-in-depth
// for the composition (mirrors the resilience of getSmartPeopleIndicators).
async function resolveOrEmpty<T>(
  promise: Promise<readonly T[]>
): Promise<readonly T[]> {
  try {
    return await promise
  } catch (error) {
    console.error(
      "[people-analytics] indicator load failed",
      error
    )
    return []
  }
}

export async function getPeopleAnalyticsDashboard(
  companyId: string
): Promise<PeopleAnalyticsDashboard> {
  const [
    employees,
    openJobOpenings,
    pendingApprovals,
    headcountSnapshots,
  ] = await Promise.all([
    resolveOrEmpty(getActiveEmployeesForAnalytics(companyId)),
    resolveOrEmpty(getOpenJobOpeningsForAnalytics(companyId)),
    resolveOrEmpty(
      getPendingJobOpeningApprovalsForAnalytics(companyId)
    ),
    resolveOrEmpty(
      getOrganizationHeadcountForAnalytics(companyId)
    ),
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
