import {
  assertApprovalDomain,
} from "../errors/approval-domain-error"

export function requireText(
  value: string,
  field: string
): string {
  const normalized = value.trim()

  assertApprovalDomain(
    normalized.length > 0,
    "invalid_input",
    `${field} é obrigatório.`,
    { field }
  )

  return normalized
}

export function optionalText(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function requireValidDate(
  value: Date,
  field: string
): Date {
  assertApprovalDomain(
    !Number.isNaN(value.getTime()),
    "invalid_input",
    `${field} deve ser uma data válida.`,
    { field }
  )

  return new Date(value.getTime())
}
