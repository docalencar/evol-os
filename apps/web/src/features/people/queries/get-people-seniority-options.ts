import "server-only"

import { getPositionSeniorities } from "@/features/organization/position-seniorities"

// A single applicable seniority a person can be assigned to for a given position.
// Only active specific profiles are offered as business seniorities; the base
// profile is never surfaced here.
export type PositionSeniorityOption = Readonly<{
  profileId: string
  seniorityLevelId: string
  label: string
}>

export type SeniorityOptionsByPosition = Readonly<
  Record<string, PositionSeniorityOption[]>
>

// Builds, for each position, the list of active applicable seniority profiles,
// so the People form can offer a Position-scoped seniority selector without any
// browser round-trip or direct table read. Reads go through the trusted 0101/0102
// boundaries (via getPositionSeniorities).
export async function getPeopleSeniorityOptions(
  companyId: string,
  positionIds: readonly string[]
): Promise<SeniorityOptionsByPosition> {
  const uniquePositionIds = [...new Set(positionIds)]

  const entries = await Promise.all(
    uniquePositionIds.map(async (positionId) => {
      const { applicable } = await getPositionSeniorities(
        companyId,
        positionId
      )

      const options: PositionSeniorityOption[] = applicable.map(
        (seniority) => ({
          profileId: seniority.profileId,
          seniorityLevelId: seniority.seniorityLevelId,
          label: seniority.label,
        })
      )

      return [positionId, options] as const
    })
  )

  return Object.fromEntries(entries)
}
