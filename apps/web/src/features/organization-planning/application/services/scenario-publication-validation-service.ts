import type { ScenarioExecutionInput, ScenarioExecutionResult } from "../../projection"
import { findUnexecutedChangeSetFailures } from "../handlers/planning-handler-support"
import type {
  PlanningChangeSetRepository,
  PlanningProjectionSnapshotRepository,
  ScenarioApplicationRepository,
  WorkspaceApplicationRepository,
} from "../ports"
import type {
  PublicationValidationIssue,
  PublicationValidationResult,
  ValidateScenarioPublicationInput,
} from "../contracts/publication-validation-contract"

type Dependencies = Readonly<{
  scenarios: ScenarioApplicationRepository
  workspaces: WorkspaceApplicationRepository
  snapshots: PlanningProjectionSnapshotRepository
  changeSets: PlanningChangeSetRepository
  executor: Readonly<{ execute(input: ScenarioExecutionInput): ScenarioExecutionResult }>
}>

export class ScenarioPublicationValidationService {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(input: ValidateScenarioPublicationInput): Promise<PublicationValidationResult> {
    const scenario = await this.dependencies.scenarios.findById(input.companyId, input.scenarioId)
    if (!scenario) return result([issue("planning.scenario.not_found", "Cenário não encontrado.")])

    const eligibilityErrors: PublicationValidationIssue[] = []
    if (scenario.status !== "approved") {
      eligibilityErrors.push(issue(
        `planning.scenario.status.${scenario.status}`,
        scenario.status === "draft"
          ? "O cenário ainda precisa ser aprovado antes da publicação."
          : "O cenário não está elegível para publicação."
      ))
    }
    if (scenario.version !== input.expectedVersion) {
      eligibilityErrors.push(issue("planning.scenario.version_conflict", "O cenário foi alterado após o carregamento."))
    }

    const [workspace, snapshot, changeSets] = await Promise.all([
      this.dependencies.workspaces.findById(input.companyId, scenario.workspaceId),
      this.dependencies.snapshots.findProjectionById(input.companyId, scenario.baseSnapshotId),
      this.dependencies.changeSets.listPublishableByScenario({ companyId: input.companyId, scenarioId: scenario.id }),
    ])

    if (!workspace) eligibilityErrors.push(issue("planning.workspace.not_found", "Workspace do cenário não encontrado."))
    if (!snapshot) eligibilityErrors.push(issue("planning.snapshot.not_found", "Snapshot-base não encontrado."))
    else {
      if (snapshot.workspaceId !== scenario.workspaceId) eligibilityErrors.push(issue("planning.snapshot.workspace_mismatch", "Snapshot-base incompatível com o workspace."))
      if (!snapshot.kind || !snapshot.organization) eligibilityErrors.push(issue("planning.snapshot.organization_missing", "Snapshot-base sem organização persistida."))
    }

    if (eligibilityErrors.length > 0 || !snapshot?.organization || !snapshot.kind) {
      return result(eligibilityErrors)
    }

    const execution = this.dependencies.executor.execute({
      snapshot,
      scenario: scenario.toContract(),
      changeSets,
    })
    const errors = [
      ...execution.issues,
      ...findUnexecutedChangeSetFailures(changeSets, execution.executedChangeSets),
    ]
    return result(errors, execution.warnings)
  }
}

function issue(code: string, message: string): PublicationValidationIssue {
  return Object.freeze({ code, message })
}

function result(
  errors: readonly PublicationValidationIssue[],
  warnings: readonly PublicationValidationIssue[] = []
): PublicationValidationResult {
  const frozenErrors = Object.freeze(errors.map((current) => Object.freeze({ ...current })))
  const frozenWarnings = Object.freeze(warnings.map((current) => Object.freeze({ ...current })))
  return Object.freeze({ valid: frozenErrors.length === 0, errors: frozenErrors, warnings: frozenWarnings })
}
