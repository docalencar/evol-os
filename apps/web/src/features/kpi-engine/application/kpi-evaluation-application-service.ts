import type {
  CreateKPIEvaluationInput,
  KPIEvaluation,
  KPIEvaluationService,
} from "../evaluations"
import { copyJsonObject } from "../evaluations/kpi-evaluation-context"
import type {
  KPIEvaluationRepository,
  ListKPIEvaluationsByCompanyInput,
  ListKPIEvaluationsByDefinitionInput,
  ListKPIEvaluationsByScopeInput,
} from "../repositories"
import { KPIEvaluationApplicationError } from "./kpi-evaluation-application-error"
import type { KPIEvaluationDTO } from "./kpi-evaluation-dto"

export type EvaluateKPIInput = CreateKPIEvaluationInput

export type GetKPIEvaluationInput = Readonly<{
  companyId: string
  evaluationId: string
}>

export type ListKPIEvaluationsInput =
  | ListKPIEvaluationsByCompanyInput
  | ListKPIEvaluationsByDefinitionInput
  | ListKPIEvaluationsByScopeInput

export class KPIEvaluationApplicationService {
  constructor(
    private readonly evaluationService: KPIEvaluationService,
    private readonly evaluations: KPIEvaluationRepository
  ) {}

  async evaluate(input: EvaluateKPIInput): Promise<KPIEvaluationDTO> {
    const evaluation = this.evaluationService.create(input)
    try {
      await this.evaluations.save(evaluation)
    } catch (error) {
      throw repositoryFailure("persistir", error)
    }
    return toKPIEvaluationDTO(evaluation)
  }

  async getEvaluationById(
    input: GetKPIEvaluationInput
  ): Promise<KPIEvaluationDTO | null> {
    try {
      const evaluation = await this.evaluations.findById(
        input.companyId,
        input.evaluationId
      )
      return evaluation ? toKPIEvaluationDTO(evaluation) : null
    } catch (error) {
      throw repositoryFailure("buscar", error)
    }
  }

  async listEvaluationsByCompany(
    input: ListKPIEvaluationsByCompanyInput
  ): Promise<readonly KPIEvaluationDTO[]> {
    return this.list(() => this.evaluations.listByCompany(input))
  }

  async listEvaluationsByDefinition(
    input: ListKPIEvaluationsByDefinitionInput
  ): Promise<readonly KPIEvaluationDTO[]> {
    return this.list(() => this.evaluations.listByDefinition(input))
  }

  async listEvaluationsByScope(
    input: ListKPIEvaluationsByScopeInput
  ): Promise<readonly KPIEvaluationDTO[]> {
    return this.list(() => this.evaluations.listByScope(input))
  }

  private async list(
    query: () => Promise<readonly KPIEvaluation[]>
  ): Promise<readonly KPIEvaluationDTO[]> {
    try {
      return Object.freeze((await query()).map(toKPIEvaluationDTO))
    } catch (error) {
      throw repositoryFailure("listar", error)
    }
  }
}

export function toKPIEvaluationDTO(evaluation: KPIEvaluation): KPIEvaluationDTO {
  return Object.freeze({
    id: evaluation.id,
    context: Object.freeze({
      ...evaluation.context,
      periodStart: evaluation.context.periodStart.toISOString(),
      periodEnd: evaluation.context.periodEnd.toISOString(),
      evaluatedAt: evaluation.context.evaluatedAt.toISOString(),
      metadata: copyJsonObject(evaluation.context.metadata),
    }),
    definition: Object.freeze({
      ...evaluation.definition,
      thresholds: Object.freeze(evaluation.definition.thresholds.map(
        (threshold) => Object.freeze({ ...threshold })
      )),
      features: Object.freeze({ ...evaluation.definition.features }),
    }),
    definitionVersion: evaluation.definitionVersion,
    result: Object.freeze({
      result: Object.freeze({
        ...evaluation.result.result,
        calculatedAt: evaluation.result.result.calculatedAt.toISOString(),
      }),
      sla: evaluation.result.sla ? Object.freeze({ ...evaluation.result.sla }) : null,
      trend: evaluation.result.trend ? Object.freeze({ ...evaluation.result.trend }) : null,
      benchmark: evaluation.result.benchmark
        ? Object.freeze({ ...evaluation.result.benchmark })
        : null,
      alerts: Object.freeze(evaluation.result.alerts.map(
        (alert) => Object.freeze({ ...alert })
      )),
      forecast: evaluation.result.forecast ? Object.freeze({
        status: evaluation.result.forecast.status,
        points: Object.freeze(evaluation.result.forecast.points.map(
          (point) => Object.freeze({
            occurredAt: point.occurredAt.toISOString(),
            value: point.value,
          })
        ),),
      }) : null,
    }),
    createdAt: evaluation.createdAt.toISOString(),
  })
}

function repositoryFailure(operation: string, cause: unknown): KPIEvaluationApplicationError {
  return new KPIEvaluationApplicationError(
    `Não foi possível ${operation} a avaliação de KPI.`,
    { cause }
  )
}
