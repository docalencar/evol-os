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

    for (const failure of source.failures ?? []) {
      warnings.push(Object.freeze({
        code: failure,
        message: failure === "workspace_read_failed"
          ? "Não foi possível carregar o workspace de Planning."
          : "Não foi possível carregar os cenários de Planning.",
      }))
    }

    if (!source.workspaceId && !source.failures?.includes("workspace_read_failed")) {
      warnings.push(
        Object.freeze({
          code: "workspace_unavailable",
          message:
            "Nenhum workspace de planejamento está disponível para o contexto executivo.",
        }),
      )
    }

    if (!source.scenarioId && !source.failures?.includes("scenario_read_failed")) {
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
