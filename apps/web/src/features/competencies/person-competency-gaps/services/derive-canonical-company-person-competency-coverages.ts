import { deriveCanonicalPersonCompetencyCoverage } from "./derive-canonical-person-competency-coverage"
import type {
  CanonicalPersonCompetencyCoverage,
  PersonCompetencyExpectationRow,
} from "../types/person-competency-gap"

export function deriveCanonicalCompanyPersonCompetencyCoverages(
  rows: readonly PersonCompetencyExpectationRow[],
): readonly CanonicalPersonCompetencyCoverage[] {
  const rowsByPerson = new Map<string, PersonCompetencyExpectationRow[]>()

  for (const row of rows) {
    const personRows = rowsByPerson.get(row.person_id) ?? []
    personRows.push(row)
    rowsByPerson.set(row.person_id, personRows)
  }

  return Object.freeze(
    [...rowsByPerson.entries()]
      .sort(([leftPersonId], [rightPersonId]) =>
        leftPersonId.localeCompare(rightPersonId),
      )
      .map(([, personRows]) => {
        const orderedRows = [...personRows].sort((left, right) => {
          if (left.competency_name === null) return -1
          if (right.competency_name === null) return 1

          return left.competency_name.localeCompare(right.competency_name)
            || (left.competency_id ?? "").localeCompare(right.competency_id ?? "")
        })

        return deriveCanonicalPersonCompetencyCoverage(orderedRows)
      }),
  )
}
