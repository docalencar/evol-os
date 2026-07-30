import type { KPIEvaluation, KPIEvaluationScopeType } from "../evaluations"

export type PaginationInput = Readonly<{
  limit?: number
  offset?: number
}>

export type ListKPIEvaluationsByCompanyInput = Readonly<{
  companyId: string
}> & PaginationInput

export type ListKPIEvaluationsByDefinitionInput = Readonly<{
  companyId: string
  definitionKey: string
  definitionVersion?: number
  periodStart?: Date
  periodEnd?: Date
}> & PaginationInput

export type ListKPIEvaluationsByScopeInput = Readonly<{
  companyId: string
  scopeType: KPIEvaluationScopeType
  scopeId?: string
  definitionKey?: string
  periodStart?: Date
  periodEnd?: Date
}> & PaginationInput

export interface KPIEvaluationRepository {
  save(evaluation: KPIEvaluation): Promise<void>
  findById(companyId: string, evaluationId: string): Promise<KPIEvaluation | null>
  listByCompany(input: ListKPIEvaluationsByCompanyInput): Promise<readonly KPIEvaluation[]>
  listByDefinition(input: ListKPIEvaluationsByDefinitionInput): Promise<readonly KPIEvaluation[]>
  listByScope(input: ListKPIEvaluationsByScopeInput): Promise<readonly KPIEvaluation[]>
}
