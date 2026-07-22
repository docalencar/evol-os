import { createWorkspace } from "../../services/create-workspace"
import { INITIAL_PLANNING_SNAPSHOT_VERSION } from "../../types/planning-contracts"
import type { CreateWorkspaceCommand } from "../commands"
import { createWorkspaceCommandSchema } from "../commands/planning-command-schemas"
import { toWorkspaceDTO } from "../dto/planning-dto-mappers"
import type {
  SnapshotApplicationRepository,
  SnapshotVersionAllocator,
  WorkspaceApplicationRepository,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PlanningUnitOfWork } from "../transactions"
import { executeInUnitOfWork } from "./planning-handler-support"

export class CreateWorkspaceHandler {
  constructor(
    private readonly workspaces: WorkspaceApplicationRepository,
    private readonly snapshots: SnapshotApplicationRepository,
    private readonly versionAllocator: SnapshotVersionAllocator,
    private readonly unitOfWork: PlanningUnitOfWork,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(command: CreateWorkspaceCommand) {
    const input = createWorkspaceCommandSchema.parse(command)

    return executeInUnitOfWork(this.unitOfWork, async () => {
      const allocatedInitialSnapshotVersion =
        await this.versionAllocator.allocate(input.workspaceId)

      if (
        allocatedInitialSnapshotVersion !==
        INITIAL_PLANNING_SNAPSHOT_VERSION
      ) {
        throw new Error(
          "A primeira versão alocada para o workspace deve ser 1."
        )
      }

      const { workspace, initialSnapshot } = createWorkspace({
        id: input.workspaceId,
        companyId: input.companyId,
        initialSnapshotId: input.initialSnapshotId,
        allocatedInitialSnapshotVersion,
        createdAt: input.occurredAt,
      })

      await this.workspaces.create(workspace)
      await this.snapshots.create(initialSnapshot)
      this.eventCollector.collect({ workspace, snapshot: initialSnapshot })

      return toWorkspaceDTO(workspace, initialSnapshot)
    })
  }
}
