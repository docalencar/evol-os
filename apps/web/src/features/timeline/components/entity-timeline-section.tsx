import {
  ActivityTimelineCard,
  type ActivityTimelineCardProps,
} from "./activity-timeline-card"

export type EntityTimelineSectionProps = {
  items: ActivityTimelineCardProps[]
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
  initialVisibleCount?: number
}

export function EntityTimelineSection({
  items,
  title = "Histórico",
  description = "Acompanhe acontecimentos e alterações importantes.",
  emptyTitle = "Nenhuma atividade registrada",
  emptyDescription = "As movimentações aparecerão aqui.",
  initialVisibleCount,
}: EntityTimelineSectionProps) {
  const usesProgressiveDisclosure =
    initialVisibleCount !== undefined &&
    initialVisibleCount > 0 &&
    items.length > initialVisibleCount
  const compactItems = usesProgressiveDisclosure
    ? items.slice(0, initialVisibleCount)
    : items
  const disclosedItems = usesProgressiveDisclosure
    ? items.slice(initialVisibleCount)
    : []

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
          {compactItems.map((item, index) => (
            <ActivityTimelineCard
              key={`${item.title}-${item.occurredAtLabel}-${index}`}
              {...item}
            />
          ))}

          {disclosedItems.length > 0 ? (
            <details className="group space-y-3">
              <summary className="w-fit cursor-pointer list-none rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span className="group-open:hidden">
                  Ver mais atividades
                </span>
                <span className="hidden group-open:inline">
                  Mostrar menos
                </span>
              </summary>

              <div className="space-y-3">
                {disclosedItems.map((item, index) => (
                  <ActivityTimelineCard
                    key={`${item.title}-${item.occurredAtLabel}-${initialVisibleCount}-${index}`}
                    {...item}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </section>
  )
}
