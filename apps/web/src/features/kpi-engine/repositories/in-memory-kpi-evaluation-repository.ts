import { copyKPIEvaluation, type KPIEvaluation } from "../evaluations"
import type {
  KPIEvaluationRepository,
  ListKPIEvaluationsByCompanyInput,
  ListKPIEvaluationsByDefinitionInput,
  ListKPIEvaluationsByScopeInput,
  PaginationInput,
} from "./kpi-evaluation-repository"

export class InMemoryKPIEvaluationRepository implements KPIEvaluationRepository {
  private readonly evaluations = new Map<string, KPIEvaluation>()

  async save(evaluation: KPIEvaluation): Promise<void> {
    this.evaluations.set(evaluation.id, copyKPIEvaluation(evaluation))
  }

  async findById(companyId: string, evaluationId: string): Promise<KPIEvaluation | null> {
    const evaluation = this.evaluations.get(evaluationId)
    return evaluation?.context.companyId === companyId
      ? copyKPIEvaluation(evaluation)
      : null
  }

  async listByCompany(
    input: ListKPIEvaluationsByCompanyInput
  ): Promise<readonly KPIEvaluation[]> {
    return this.query(
      (evaluation) => evaluation.context.companyId === input.companyId,
      input
    )
  }

  async listByDefinition(
    input: ListKPIEvaluationsByDefinitionInput
  ): Promise<readonly KPIEvaluation[]> {
    return this.query((evaluation) =>
      evaluation.context.companyId === input.companyId &&
      evaluation.context.definitionKey === input.definitionKey &&
      (input.definitionVersion === undefined ||
        evaluation.definitionVersion === input.definitionVersion) &&
      isInsidePeriod(evaluation, input.periodStart, input.periodEnd), input)
  }

  async listByScope(
    input: ListKPIEvaluationsByScopeInput
  ): Promise<readonly KPIEvaluation[]> {
    return this.query((evaluation) =>
      evaluation.context.companyId === input.companyId &&
      evaluation.context.scopeType === input.scopeType &&
      (input.scopeId === undefined || evaluation.context.scopeId === input.scopeId) &&
      (input.definitionKey === undefined ||
        evaluation.context.definitionKey === input.definitionKey) &&
      isInsidePeriod(evaluation, input.periodStart, input.periodEnd), input)
  }

  private query(
    predicate: (evaluation: KPIEvaluation) => boolean,
    pagination: PaginationInput
  ): readonly KPIEvaluation[] {
    const offset = Math.max(0, pagination.offset ?? 0)
    const limit = pagination.limit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, pagination.limit)
    const values = [...this.evaluations.values()]
      .filter(predicate)
      .sort((left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.id.localeCompare(right.id))
      .slice(offset, offset + limit)
      .map(copyKPIEvaluation)
    return Object.freeze(values)
  }
}

function isInsidePeriod(
  evaluation: KPIEvaluation,
  periodStart?: Date,
  periodEnd?: Date
): boolean {
  const evaluatedAt = evaluation.context.evaluatedAt.getTime()
  return (periodStart === undefined || evaluatedAt >= periodStart.getTime()) &&
    (periodEnd === undefined || evaluatedAt <= periodEnd.getTime())
}
