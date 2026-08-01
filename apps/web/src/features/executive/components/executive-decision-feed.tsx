import { AlertCircle } from "lucide-react"

type ExecutiveDecisionFeedProps = {
  alerts: readonly string[]
}

export function ExecutiveDecisionFeed({
  alerts,
}: ExecutiveDecisionFeedProps) {
  return (
    <section
      aria-labelledby="executive-decision-feed-title"
      className="rounded-xl border bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <AlertCircle
          aria-hidden="true"
          className="h-5 w-5 text-muted-foreground"
        />

        <h2
          id="executive-decision-feed-title"
          className="text-lg font-semibold"
        >
          Decision Feed
        </h2>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma decisão pendente no momento.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert, index) => (
            <li
              key={`${index}:${alert}`}
              className="rounded-lg border p-4"
            >
              <p className="font-medium">
                Atenção executiva
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {alert}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
