import type { PeopleSummary } from "@/features/people/dashboard/types/people-summary"
import type { Employee } from "@/features/people"

import type { DecisionFeedProvider } from "../aggregators"
import type {
  DecisionFeedDTO,
  DecisionFeedItemDTO,
} from "../types"

export type PeopleExecutiveSource = Readonly<{
  load(): Promise<{
    summary: PeopleSummary
    employees: readonly Employee[]
  }>
}>

export class PeopleDecisionFeedProvider
  implements DecisionFeedProvider
{
  readonly key = "people"

  constructor(
    private readonly generatedAt: string,
    private readonly source: PeopleExecutiveSource,
  ) {}

  async load(): Promise<DecisionFeedDTO> {
    const { employees } =
      await this.source.load()

    const items = employees
      .filter(
        (employee) =>
          employee.status === "on_leave" ||
          employee.status === "terminated",
      )
      .map((employee) =>
        createItem(employee),
      )

    return {
      generatedAt: this.generatedAt,
      items,
    }
  }
}

function createItem(
  employee: Employee,
): DecisionFeedItemDTO {
  return {
    id: `employee:${employee.id}`,
    source: "people",
    category: "people",
    priority:
      employee.status === "terminated"
        ? "high"
        : "medium",
    title: employee.full_name,
    description:
      employee.status === "terminated"
        ? "Colaborador desligado recentemente."
        : "Colaborador afastado.",
    occurredAt:
      employee.updated_at,
    href: `/app/people/${employee.id}`,
    badges: [
      employee.status,
    ],
  }
}
