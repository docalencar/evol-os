import type {
  KPIEvaluationHistoryRepository,
  ListKPIEvaluationsByPeriodInput,
  ListLatestKPIEvaluationsInput,
} from "../repositories/supabase-kpi-evaluation-repository-adapter"
import type { KPIHistoryEntryDTO } from "./kpi-history-dto"
import { toKPIHistoryEntryDTO } from "./kpi-history-dto"

export class KPIHistoryQueryService {
  constructor(
    private readonly evaluations: KPIEvaluationHistoryRepository
  ) {}

  async listByPeriod(
    input: ListKPIEvaluationsByPeriodInput
  ): Promise<readonly KPIHistoryEntryDTO[]> {
    return this.present(await this.evaluations.listByPeriod(input))
  }

  async listLatest(
    input: ListLatestKPIEvaluationsInput
  ): Promise<readonly KPIHistoryEntryDTO[]> {
    return this.present(await this.evaluations.listLatest(input))
  }

  private present(
    evaluations: Awaited<ReturnType<KPIEvaluationHistoryRepository["listLatest"]>>
  ): readonly KPIHistoryEntryDTO[] {
    return Object.freeze(evaluations.map(toKPIHistoryEntryDTO))
  }
}
