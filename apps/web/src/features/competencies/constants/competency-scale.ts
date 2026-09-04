// Canonical Career / Seniority competency scale semantics (PD-021 / plan §8).
//
// The database stores integers only (expected_level, weight ∈ 1..5) and a text
// `type` domain; these labels are the single source of truth for how those
// persisted values are presented in the application (matrix UI, dialogs, and the
// future Slice 5 gap presentation). Do NOT change persisted DB values or checks —
// this module maps stored values to human labels, it never redefines them.

export const PROFICIENCY_LEVELS = [1, 2, 3, 4, 5] as const
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number]

export const WEIGHT_LEVELS = [1, 2, 3, 4, 5] as const
export type WeightLevel = (typeof WEIGHT_LEVELS)[number]

// Persisted `type` domain of position_seniority_competencies / position_competencies
// (migration 0005 / 0120): core | leadership | promotion | optional.
export const COMPETENCY_TYPES = [
  "core",
  "leadership",
  "promotion",
  "optional",
] as const
export type CompetencyType = (typeof COMPETENCY_TYPES)[number]

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  1: "Inicial",
  2: "Básico",
  3: "Proficiente",
  4: "Avançado",
  5: "Referência",
}

export const WEIGHT_LABELS: Record<WeightLevel, string> = {
  1: "Complementar",
  2: "Baixa",
  3: "Importante",
  4: "Alta",
  5: "Crítica",
}

export const COMPETENCY_TYPE_LABELS: Record<CompetencyType, string> = {
  core: "Essencial",
  leadership: "Liderança",
  promotion: "Promoção",
  optional: "Opcional",
}

function isProficiencyLevel(value: number): value is ProficiencyLevel {
  return PROFICIENCY_LEVELS.includes(value as ProficiencyLevel)
}

function isWeightLevel(value: number): value is WeightLevel {
  return WEIGHT_LEVELS.includes(value as WeightLevel)
}

function isCompetencyType(value: string): value is CompetencyType {
  return (COMPETENCY_TYPES as readonly string[]).includes(value)
}

// Label helpers. They accept the raw persisted value and a NULL (not-defined)
// cell, returning `null` for absent values so callers never fabricate a label.

export function proficiencyLabel(level: number | null): string | null {
  if (level === null || !isProficiencyLevel(level)) {
    return null
  }
  return PROFICIENCY_LABELS[level]
}

export function weightLabel(weight: number | null): string | null {
  if (weight === null || !isWeightLevel(weight)) {
    return null
  }
  return WEIGHT_LABELS[weight]
}

export function competencyTypeLabel(type: string | null): string | null {
  if (type === null || !isCompetencyType(type)) {
    return null
  }
  return COMPETENCY_TYPE_LABELS[type]
}
