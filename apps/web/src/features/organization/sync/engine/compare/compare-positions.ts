import type {
  PositionSnapshot,
} from "../../types/organization-snapshot"

export type PositionComparisonOperation =
  | "create"
  | "unchanged"
  | "missing"

export type PositionComparisonItem = {
  name: string

  department: string | null

  operation: PositionComparisonOperation
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export function comparePositions(
  current: PositionSnapshot[],
  desired: PositionSnapshot[]
): PositionComparisonItem[] {
  const currentMap = new Map(
    current.map((position) => [
      normalize(position.name),
      position,
    ])
  )

  const desiredMap = new Map(
    desired.map((position) => [
      normalize(position.name),
      position,
    ])
  )

  const result: PositionComparisonItem[] = []

  for (const position of desired) {
    result.push({
      name: position.name,
      department: position.department ?? null,
      operation: currentMap.has(normalize(position.name))
        ? "unchanged"
        : "create",
    })
  }

  for (const position of current) {
    if (!desiredMap.has(normalize(position.name))) {
      result.push({
        name: position.name,
        department: position.department ?? null,
        operation: "missing",
      })
    }
  }

  return result.sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
