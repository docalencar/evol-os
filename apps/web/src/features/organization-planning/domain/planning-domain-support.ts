import { assertPlanningDomain } from "./planning-domain-error"

export function requireText(value: string, field: string) {
  const normalized = value.trim()

  assertPlanningDomain(
    normalized.length > 0,
    "invalid_input",
    `${field} é obrigatório.`
  )

  return normalized
}

export function requireVersion(value: number) {
  assertPlanningDomain(
    Number.isInteger(value) && value > 0,
    "invalid_input",
    "A versão deve ser um inteiro positivo."
  )

  return value
}

export function requireDate(value: Date, field: string) {
  assertPlanningDomain(
    Number.isFinite(value.getTime()),
    "invalid_input",
    `${field} deve ser uma data válida.`
  )

  return new Date(value.getTime())
}
