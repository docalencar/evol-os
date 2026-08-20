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

  return { applicable, available }
}
