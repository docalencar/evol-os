import { createWorkspace } from "../../services/create-workspace"
import { INITIAL_PLANNING_SNAPSHOT_VERSION } from "../../types/planning-contracts"
import { createBaselineOrganization } from "../services"
import type { CreateWorkspaceCommand } from "../commands"
import { createWorkspaceCommandSchema } from "../commands/planning-command-schemas"
import { toWorkspaceDTO } from "../dto/planning-dto-mappers"
import type {
  PlanningBaselineRepository,
  PlanningOperationalOrganizationSource,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import { PlanningApplicationError } from "./planning-handler-support"

export class CreateWorkspaceHandler {
  constructor(
    private readonly baseline: PlanningBaselineRepository,
    private readonly operationalOrganization: PlanningOperationalOrganizationSource,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(command: CreateWorkspaceCommand) {
    const input = createWorkspaceCommandSchema.parse(command)

    if (await this.baseline.existsBaselineByCompany(input.companyId)) {
      throw new PlanningApplicationError(
        "invalid_relation",
        "A empresa já possui um Workspace com Baseline Snapshot."
      )
    }

    const source = await this.operationalOrganization.loadByCompany(
      input.companyId
    )
    const organization = createBaselineOrganization(source)

    const { workspace, initialSnapshot } = createWorkspace({
      id: input.workspaceId,
      companyId: input.companyId,
      initialSnapshotId: input.initialSnapshotId,
      allocatedInitialSnapshotVersion:
        INITIAL_PLANNING_SNAPSHOT_VERSION,
      createdAt: input.occurredAt,
    })

    await this.baseline.create({
      workspace,
      snapshot: initialSnapshot,
      organization,
    })
    this.eventCollector.collect({ workspace, snapshot: initialSnapshot })

    return toWorkspaceDTO(workspace, initialSnapshot)
  }
}
