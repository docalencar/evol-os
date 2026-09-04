import {
  competencyTypeLabel,
  proficiencyLabel,
  weightLabel,
} from "@/features/competencies/constants/competency-scale"

import type {
  CompetencyCellSource,
  PositionSeniorityCompetencyCell,
} from "../types/position-seniority-competency-cell"

// Presentation-only classification of an already-resolved cell. This maps the
// RPC's canonical `source` + `inherited` + `isBaseProfile` to a human state — it
// does NOT recompute effective inheritance (the DB owns that).
export type CompetencyCellState =
  | "base" // the Base profile's own expectation
  | "inherited" // a specific profile inheriting the Base expectation
  | "override" // a specific profile's explicit override
  | "none" // NOT DEFINED (no active Base or override)

export const COMPETENCY_CELL_STATE_LABELS: Record<CompetencyCellState, string> =
  {
    base: "Base",
    inherited: "Herdado do Base",
    override: "Personalizado",
    none: "Não definido",
  }

export type CompetencyMatrixCellViewModel = {
  positionSeniorityProfileId: string
  seniorityLevelId: string | null
  isBaseProfile: boolean
  profileActive: boolean
  competencyId: string
  state: CompetencyCellState
  stateLabel: string
  source: CompetencyCellSource
  inherited: boolean
  // Effective values (null when not defined) + their canonical labels (null too).
  expectedLevel: number | null
  expectedLevelLabel: string | null
  weight: number | null
  weightLabel: string | null
  required: boolean | null
  type: string | null
  typeLabel: string | null
  notes: string | null
  baseRowId: string | null
  overrideRowId: string | null
}

export type PositionSeniorityCompetencyMatrixViewModel = {
  cells: CompetencyMatrixCellViewModel[]
}

function classify(cell: PositionSeniorityCompetencyCell): CompetencyCellState {
  if (cell.source === "none") {
    return "none"
  }
  if (cell.source === "override") {
    return "override"
  }
  // source === "base": distinguish the Base profile's own row from a specific
  // profile inheriting it (the RPC already told us via `inherited`).
  return cell.isBaseProfile ? "base" : "inherited"
}

export function presentPositionSeniorityCompetencyMatrix(input: {
  cells: PositionSeniorityCompetencyCell[]
}): PositionSeniorityCompetencyMatrixViewModel {
  const cells = input.cells.map((cell) => {
    const state = classify(cell)
    return {
      positionSeniorityProfileId: cell.positionSeniorityProfileId,
      seniorityLevelId: cell.seniorityLevelId,
      isBaseProfile: cell.isBaseProfile,
      profileActive: cell.profileActive,
      competencyId: cell.competencyId,
      state,
      stateLabel: COMPETENCY_CELL_STATE_LABELS[state],
      source: cell.source,
      inherited: cell.inherited,
      expectedLevel: cell.expectedLevel,
      expectedLevelLabel: proficiencyLabel(cell.expectedLevel),
      weight: cell.weight,
      weightLabel: weightLabel(cell.weight),
      required: cell.required,
      type: cell.type,
      typeLabel: competencyTypeLabel(cell.type),
      notes: cell.notes,
      baseRowId: cell.baseRowId,
      overrideRowId: cell.overrideRowId,
    }
  })

  return { cells }
}
