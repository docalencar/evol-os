import {
  ActivityTimelineCard,
  type ActivityTimelineCardProps,
} from "./activity-timeline-card"

export type EmployeeTimelineSectionProps = {
  items: ActivityTimelineCardProps[]
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function EmployeeTimelineSection({
  items,
  title = "Histórico do colaborador",
  description = "Acompanhe acontecimentos e alterações importantes relacionados a este colaborador.",
  emptyTitle = "Nenhuma atividade registrada",
  emptyDescription = "As movimentações deste colaborador aparecerão aqui.",
}: EmployeeTimelineSectionProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
        </h2>

        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h3 className="text-sm font-semibold">
            {emptyTitle}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ActivityTimelineCard
              key={`${item.title}-${item.occurredAtLabel}-${index}`}
              {...item}
            />
          ))}
        </div>
      )}
    </section>
  )
}
