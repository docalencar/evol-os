import type { ExecutivePresenter } from "../presenters"
import type { ExecutiveQueryService } from "../queries"
import type { ExecutiveHomeViewModel } from "../types"

export class ExecutiveApplicationService {
  constructor(
    private readonly query: ExecutiveQueryService,
    private readonly presenter: ExecutivePresenter,
  ) {}

  async execute(): Promise<ExecutiveHomeViewModel> {
    const dto = await this.query.load()

    return this.presenter.present(dto)
  }
}