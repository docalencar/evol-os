import type {
  OrganizationOccupancy,
} from "../types/people-analytics-dashboard"

type HeadcountSnapshot = {
  currentHeadcount: number
  targetHeadcount: number
}

export function calculateOrganizationOccupancy(
  snapshots: readonly HeadcountSnapshot[]
): OrganizationOccupancy {
  const totals = snapshots.reduce(
    (result, snapshot) => ({
      current: result.current + snapshot.currentHeadcount,
      ideal: result.ideal + snapshot.targetHeadcount,
    }),
    { current: 0, ideal: 0 }
  )

  return {
    ...totals,
    difference: Math.abs(totals.ideal - totals.current),
    percentage:
      totals.ideal === 0
        ? null
        : (totals.current / totals.ideal) * 100,
  }
}
