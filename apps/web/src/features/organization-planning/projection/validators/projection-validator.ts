import type { ProjectionContext } from "../context"
import type { ProjectionIssue } from "../contracts"

export interface ProjectionValidator {
  validate(context: ProjectionContext): readonly ProjectionIssue[]
}

export class ProjectionContractValidator implements ProjectionValidator {
  validate(context: ProjectionContext): readonly ProjectionIssue[] {
    const errors: ProjectionIssue[] = []

    if (context.snapshot.companyId !== context.scenario.companyId) {
      errors.push(issue("company_mismatch", "Snapshot e cenário devem pertencer à mesma empresa."))
    }
    if (context.snapshot.workspaceId !== context.scenario.workspaceId) {
      errors.push(issue("workspace_mismatch", "Snapshot e cenário devem pertencer ao mesmo workspace."))
    }
    if (context.scenario.baseSnapshotId !== context.snapshot.id) {
      errors.push(issue("base_snapshot_mismatch", "O cenário deve referenciar o snapshot informado."))
    }

    for (const changeSet of context.changeSets) {
      if (
        changeSet.companyId !== context.scenario.companyId ||
        changeSet.scenarioId !== context.scenario.id
      ) {
        errors.push(Object.freeze({
          code: "change_set_scope_mismatch",
          message: `O change set ${changeSet.id} não pertence ao contexto da projeção.`,
          changeSetId: changeSet.id,
        }))
      }
    }

    return Object.freeze(errors)
  }
}

function issue(code: string, message: string): ProjectionIssue {
  return Object.freeze({ code, message })
}
