import type { SeniorityCatalogEntry } from "../repositories/position-seniority-profile-repository"
import type { PositionSeniorityProfile } from "../types/position-seniority-profile"

export type ApplicableSeniority = {
  profileId: string
  seniorityLevelId: string
  code: string
  label: string
  rank: number
}

export type AvailableSeniority = {
  id: string
  code: string
  label: string
}

export type PositionSenioritiesViewModel = {
  applicable: ApplicableSeniority[]
  available: AvailableSeniority[]
  // Identity of the position's active BASE profile, exposed so the competency
  // matrix can target it when the position has no expectation rows at all. The
  // matrix derives every other profile id from its own cells, and in the zero
  // state there are none — so without this the common "Base" expectation, which
  // is exactly the first one a user needs to create, would be unreachable.
  // It stays out of `applicable`: Base is infrastructure, not a seniority.
  baseProfileId: string | null
}

// Joins the position's active specific profiles with the seniority catalog.
// The BASE profile (seniorityLevelId === null) is infrastructure and is never
// surfaced as an applicable seniority. Only active catalog levels not already
// applied are offered in the add selector.
export function presentPositionSeniorities(input: {
  profiles: PositionSeniorityProfile[]
  catalog: SeniorityCatalogEntry[]
}): PositionSenioritiesViewModel {
  const byId = new Map(input.catalog.map((entry) => [entry.id, entry]))

  const applicable: ApplicableSeniority[] = input.profiles
    .filter(
      (profile) => profile.active && profile.seniorityLevelId !== null
    )
    .map((profile) => {
      const entry = byId.get(profile.seniorityLevelId as string)
      return {
        profileId: profile.id,
        seniorityLevelId: profile.seniorityLevelId as string,
        code: entry?.code ?? "",
        label: entry?.label ?? (profile.seniorityLevelId as string),
        rank: entry?.rank ?? 0,
      }
    })
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))

  const appliedIds = new Set(
    applicable.map((item) => item.seniorityLevelId)
  )

  const available: AvailableSeniority[] = input.catalog
    .filter((entry) => entry.active && !appliedIds.has(entry.id))
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .map((entry) => ({ id: entry.id, code: entry.code, label: entry.label }))

  const baseProfileId =
    input.profiles.find(
      (profile) => profile.active && profile.seniorityLevelId === null
    )?.id ?? null

  return { applicable, available, baseProfileId }
}
