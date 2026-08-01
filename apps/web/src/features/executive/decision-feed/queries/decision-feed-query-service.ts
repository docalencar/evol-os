import type { DecisionFeedDTO } from "../types"

export interface DecisionFeedDataSource {
  load(): Promise<DecisionFeedDTO>
}

export class DecisionFeedQueryService {
  constructor(
    private readonly source: DecisionFeedDataSource,
  ) {}

  load(): Promise<DecisionFeedDTO> {
    return this.source.load()
  }
}