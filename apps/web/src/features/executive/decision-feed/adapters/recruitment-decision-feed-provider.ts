import {
  JOB_OPENING_PRIORITY_LABELS,
  JOB_OPENING_STATUS_LABELS,
} from "@/features/recruitment/job-openings/constants/job-opening-options"
import type { JobOpening } from "@/features/recruitment/job-openings/types/job-opening"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
  DecisionFeedPriority,
} from "../types"

export type JobOpeningSource = Readonly<{
  load(): Promise<readonly JobOpening[]>
}>

export class RecruitmentDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "recruitment"

  constructor(
    private readonly generatedAt: string,
    private readonly source: JobOpeningSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const openings = await this.source.load()

    return Object.freeze({
      generatedAt: this.generatedAt,
      items: Object.freeze(
        openings.map(mapJobOpening),
      ),
    })
  }
}

function mapJobOpening(
  jobOpening: JobOpening,
): DecisionFeedItemDTO {
  return Object.freeze({
    id: `job-opening:${jobOpening.id}`,
    source: "recruitment",
    category:
      jobOpening.status === "pending_approval"
        ? "approval"
        : "people",
    priority: resolvePriority(jobOpening),
    title: `Vaga: ${jobOpening.title}`,
    description:
      `Status: ${JOB_OPENING_STATUS_LABELS[jobOpening.status]}.`,
    occurredAt: jobOpening.updatedAt,
    href: `/app/recruitment/job-openings/${jobOpening.id}`,
    badges: Object.freeze([
      JOB_OPENING_STATUS_LABELS[jobOpening.status],
      JOB_OPENING_PRIORITY_LABELS[jobOpening.priority],
    ]),
  })
}

function resolvePriority(
  jobOpening: JobOpening,
): DecisionFeedPriority {
  switch (jobOpening.priority) {
    case "urgent":
      return "critical"

    case "high":
      return "high"

    case "medium":
      return "medium"

    case "low":
      return "low"
  }
}