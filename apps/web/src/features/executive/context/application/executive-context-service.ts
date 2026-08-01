import type { ExecutiveContextProvider } from "../providers"
import type {
  ExecutiveContextResolution,
  ExecutiveContextWarning,
} from "../types"

export interface ExecutiveContextClock {
  now(): Date
}

export class ExecutiveContextService {
  constructor(
    private readonly provider: ExecutiveContextProvider,
    private readonly clock: ExecutiveContextClock,
  ) {}

  async resolve(): Promise<ExecutiveContextResolution> {
    const source = await this.provider.load()
    const warnings: ExecutiveContextWarning[] = []

    if (!source.workspaceId) {
      warnings.push(
        Object.freeze({
          code: "workspace_unavailable",
          message:
            "Nenhum workspace de planejamento está disponível para o contexto executivo.",
        }),
      )
    }

    if (!source.scenarioId) {
      warnings.push(
        Object.freeze({
          code: "scenario_unavailable",
          message:
            "Nenhum cenário de planejamento está disponível para o contexto executivo.",
        }),
      )
    }

    return Object.freeze({
      context: Object.freeze({
        companyId: source.companyId,
        workspaceId: source.workspaceId,
        scenarioId: source.scenarioId,
        generatedAt: this.clock.now().toISOString(),
      }),
      warnings: Object.freeze(warnings),
    })
  }
}
