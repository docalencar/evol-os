import { DecisionFeedPresenter } from "../presenters"
import { DecisionFeedQueryService } from "../queries"
import type { DecisionFeedViewModel } from "../types"

export class DecisionFeedApplicationService {
  constructor(
    private readonly query: DecisionFeedQueryService,
    private readonly presenter: DecisionFeedPresenter,
  ) {}

  async execute(): Promise<DecisionFeedViewModel> {
    const dto = await this.query.load()

    return this.presenter.present(dto)
  }
}