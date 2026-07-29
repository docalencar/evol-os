const COMPANY_ID_COLUMN = "company_id" as const

/**
 * Retorna o filtro padrão de isolamento por empresa.
 *
 * O helper não recebe o builder do Supabase para evitar acoplamento
 * aos tipos genéricos internos do PostgREST.
 */
export function scopeCompany(companyId: string) {
  return [COMPANY_ID_COLUMN, companyId] as const
}
