import type { KPIDashboardQueryService } from "../queries"
import type { KPIDashboardPresenter } from "../presenters"
import type { KPIDashboardViewModel } from "../types"

export class KPIDashboardApplicationService {
  constructor(private readonly query: KPIDashboardQueryService,
    private readonly presenter: KPIDashboardPresenter) {}
  async execute(): Promise<KPIDashboardViewModel> { return this.presenter.present(await this.query.load()) }
}
