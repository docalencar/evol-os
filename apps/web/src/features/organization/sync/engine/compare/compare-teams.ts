import type {
  TeamSnapshot,
} from "../../types/organization-snapshot"

export type TeamComparisonOperation =
  | "create"
  | "unchanged"
  | "missing"

export type TeamComparisonItem = {
  name: string

  department: string | null

  operation: TeamComparisonOperation
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export function compareTeams(
  current: TeamSnapshot[],
  desired: TeamSnapshot[]
): TeamComparisonItem[] {
  const currentMap = new Map(
    current.map((team) => [
      normalize(team.name),
      team,
    ])
  )

  const desiredMap = new Map(
    desired.map((team) => [
      normalize(team.name),
      team,
    ])
  )

  const result: TeamComparisonItem[] = []

  for (const team of desired) {
    result.push({
      name: team.name,
      department: team.department ?? null,
      operation: currentMap.has(normalize(team.name))
        ? "unchanged"
        : "create",
    })
  }

  for (const team of current) {
    if (!desiredMap.has(normalize(team.name))) {
      result.push({
        name: team.name,
        department: team.department ?? null,
        operation: "missing",
      })
    }
  }

  return result.sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
