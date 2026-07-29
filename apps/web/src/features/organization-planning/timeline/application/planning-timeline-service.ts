import type { PlanningScenario } from "../../domain/planning-scenario"
import type { PublishedSnapshot } from "../../domain/published-snapshot"
import type {
  PlanningTimeline,
  PlanningTimelineEntry,
  PlanningTimelineInput,
  PlanningTimelineScenarioSource,
  PlanningTimelineSnapshotSource,
} from "../contracts/planning-timeline-contract"
import type { PlanningTimelineViewModel } from "../presentation/planning-timeline-view-model"

type PlanningTimelinePresenterPort = Readonly<{
  present(timeline: PlanningTimeline): PlanningTimelineViewModel
}>

type PlanningTimelineDependencies = Readonly<{
  companyId: string
  scenarios: PlanningTimelineScenarioSource
  snapshots: PlanningTimelineSnapshotSource
  presenter: PlanningTimelinePresenterPort
}>

export class PlanningTimelineService {
  constructor(private readonly dependencies: PlanningTimelineDependencies) {}

  async execute(input: PlanningTimelineInput): Promise<PlanningTimelineViewModel> {
    const [companyScenarios, companySnapshots] = await Promise.all([
      this.dependencies.scenarios.findAllByCompany(this.dependencies.companyId),
      this.dependencies.snapshots.findAllByCompany(this.dependencies.companyId),
    ])
    const scenarios = companyScenarios
      .filter((scenario) => scenario.workspaceId === input.workspaceId)
      .sort(compareScenarios)
    const snapshots = companySnapshots.filter(
      (snapshot) => snapshot.workspaceId === input.workspaceId
    )
    const baseVersions = indexBaseSnapshotVersions(snapshots)
    const publications = indexScenarioPublications(snapshots)
    const currentScenarioId = scenarios.at(-1)?.id ?? null
    const items = scenarios.map((scenario) =>
      createEntry(scenario, {
        baselineVersion: baseVersions.get(scenario.baseSnapshotId) ?? null,
        publishedAt: publications.get(scenario.id) ?? null,
        current: scenario.id === currentScenarioId,
      })
    )

    return this.dependencies.presenter.present(
      Object.freeze({
        workspaceId: input.workspaceId,
        items: Object.freeze(items),
      })
    )
  }
}

function compareScenarios(left: PlanningScenario, right: PlanningScenario): number {
  return (
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.updatedAt.getTime() - right.updatedAt.getTime() ||
    left.id.localeCompare(right.id)
  )
}

function indexBaseSnapshotVersions(
  snapshots: readonly PublishedSnapshot[]
): ReadonlyMap<string, number> {
  return new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.version]))
}

function indexScenarioPublications(
  snapshots: readonly PublishedSnapshot[]
): ReadonlyMap<string, Date> {
  const publications = new Map<string, Date>()

  for (const snapshot of [...snapshots].sort(compareSnapshots)) {
    if (snapshot.sourceScenarioId) {
      publications.set(snapshot.sourceScenarioId, snapshot.publishedAt)
    }
  }

  return publications
}

function compareSnapshots(left: PublishedSnapshot, right: PublishedSnapshot): number {
  return left.version - right.version || left.id.localeCompare(right.id)
}

function createEntry(
  scenario: PlanningScenario,
  metadata: Readonly<{
    baselineVersion: number | null
    publishedAt: Date | null
    current: boolean
  }>
): PlanningTimelineEntry {
  return Object.freeze({
    id: scenario.id,
    version: scenario.version,
    name: scenario.name,
    status: scenario.status,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    publishedAt: metadata.publishedAt
      ? new Date(metadata.publishedAt.getTime())
      : null,
    author: null,
    baselineVersion: metadata.baselineVersion,
    current: metadata.current,
    published: scenario.status === "published",
  })
}
