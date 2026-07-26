export function readRequiredString(
  payload: Record<string, unknown>,
  field: string
): string {
  const value = payload[field]

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid payload: ${field} inválido.`
    )
  }

  return value.trim()
}


export function readOptionalString(
  payload: Record<string, unknown>,
  field: string
): string | null {
  const value = payload[field]

  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  if (typeof value !== "string") {
    throw new Error(
      `Invalid payload: ${field} inválido.`
    )
  }

  const normalized =
    value.trim()

  return normalized.length > 0
    ? normalized
    : null
}
