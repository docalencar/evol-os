import type { ExecutiveHomeDTO } from "../types"

export interface ExecutiveHomeSource {
  load(): Promise<ExecutiveHomeDTO>
}

export class ExecutiveQueryService {
  constructor(
    private readonly source: ExecutiveHomeSource
  ) {}

  load(): Promise<ExecutiveHomeDTO> {
    return this.source.load()
  }
}
