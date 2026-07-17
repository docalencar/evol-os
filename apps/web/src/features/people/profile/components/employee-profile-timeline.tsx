import {
  EmployeeTimelineSection,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"

type EmployeeProfileTimelineProps = {
  hireDate?: string | null
  items: ActivityTimelineItemViewModel[]
}

const ACTOR_TYPE_LABELS: Record<string, string> = {
  user: "Usuário",
  system: "Sistema",
  automation: "Automação",
  ai: "Inteligência artificial",
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

function formatHireDate(
  date?: string | null
) {
  if (!date) {
    return "Data de admissão não informada."
  }

  const formattedDate =
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(date))

  return `Colaborador admitido em ${formattedDate}.`
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

export function EmployeeProfileTimeline({
  hireDate,
  items,
}: EmployeeProfileTimelineProps) {
  const timelineItems =
    items.length > 0
      ? items.map((item) => ({
          title: item.title,
          description:
            item.description,
          actorLabel:
            ACTOR_TYPE_LABELS[
              item.actorType
            ] ??
            formatLabel(
              item.actorType
            ),
          occurredAtLabel:
            formatDateTime(
              item.occurredAt
            ),
          moduleLabel:
            formatLabel(
              item.module
            ),
          activityTypeLabel:
            formatLabel(
              item.activityType
            ),
        }))
      : [
          {
            title: "Admissão",
            description:
              formatHireDate(
                hireDate
              ),
            actorLabel: "Sistema",
            occurredAtLabel:
              hireDate
                ? formatDateTime(
                    hireDate
                  )
                : "Data não informada",
            moduleLabel: "Pessoas",
            activityTypeLabel:
              "Admissão",
          },
        ]

  return (
    <EmployeeTimelineSection
      items={timelineItems}
      description="Acompanhe admissões, alterações, feedbacks, avaliações e planos de desenvolvimento."
    />
  )
}
