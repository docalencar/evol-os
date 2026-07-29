export function pluralize(count: number, singular: string, plural: string): string {
  return Math.abs(count) === 1 ? singular : plural
}

export function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${pluralize(count, singular, plural)}`
}

export function formatSignedCount(count: number, singular: string, plural: string): string {
  const prefix = count > 0 ? "+" : ""
  return `${prefix}${count} ${pluralize(count, singular, plural)}`
}

export function formatHeadcount(count: number): string {
  return formatCount(count, "colaborador", "colaboradores")
}

export function formatHeadcountDelta(delta: number): string {
  return formatSignedCount(delta, "colaborador", "colaboradores")
}

export function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`
}
