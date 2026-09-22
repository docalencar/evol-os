import type { ChangeSet } from "../../types/planning-contracts"
import type { ScenarioDTO } from "../dto"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import type {
  PlanningChangeSetMutationRepository,
  ScenarioApplicationRepository,
} from "../ports"

export type DepartmentCreateContent = Readonly<{
  departmentId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
}>

export type PlanningContentReadback = Readonly<{
  scenario: ScenarioDTO
  changeSets: readonly ChangeSet[]
}>

type MutationContext = Readonly<{
  companyId: string
  scenarioId: string
  expectedVersion: number
}>

export class PlanningContentEditorService {
  constructor(
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly changeSets: PlanningChangeSetMutationRepository
  ) {}

  async createDepartment(
    input: MutationContext & Readonly<{
      changeSetId: string
      content: DepartmentCreateContent
    }>
  ): Promise<PlanningContentReadback> {
    await this.changeSets.createTrusted({
      scenarioId: input.scenarioId,
      expectedVersion: input.expectedVersion,
      changeSetId: input.changeSetId,
      changeType: "department.create",
      payload: input.content,
    })
    return this.readCanonical(input.companyId, input.scenarioId)
  }

  async replaceDepartment(
    input: MutationContext & Readonly<{
      currentChangeSetId: string
      replacementChangeSetId: string
      content: DepartmentCreateContent
    }>
  ): Promise<PlanningContentReadback> {
    await this.changeSets.replaceTrusted({
      scenarioId: input.scenarioId,
      expectedVersion: input.expectedVersion,
      currentChangeSetId: input.currentChangeSetId,
      changeSetId: input.replacementChangeSetId,
      changeType: "department.create",
      payload: input.content,
    })
    return this.readCanonical(input.companyId, input.scenarioId)
  }

  async remove(
    input: MutationContext & Readonly<{ changeSetId: string }>
  ): Promise<PlanningContentReadback> {
    await this.changeSets.removeTrusted(input)
    return this.readCanonical(input.companyId, input.scenarioId)
  }

  async reorder(
    input: MutationContext & Readonly<{ orderedChangeSetIds: readonly string[] }>
  ): Promise<PlanningContentReadback> {
    await this.changeSets.reorderTrusted(input)
    return this.readCanonical(input.companyId, input.scenarioId)
  }

  private async readCanonical(
    companyId: string,
    scenarioId: string
  ): Promise<PlanningContentReadback> {
    const [scenario, changeSets] = await Promise.all([
      this.scenarios.findById(companyId, scenarioId),
      this.changeSets.listPublishableByScenario({ companyId, scenarioId }),
    ])
    if (!scenario) throw new Error("PLANNING_RESOURCE_UNAVAILABLE")
    return Object.freeze({
      scenario: toScenarioDTO(scenario),
      changeSets: Object.freeze([...changeSets]),
    })
  }
}
