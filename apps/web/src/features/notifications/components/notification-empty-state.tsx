import { BellOff } from "lucide-react"

type NotificationEmptyStateProps = {
  title?: string
  description?: string
}

export function NotificationEmptyState({
  title = "Nenhuma notificação",
  description =
    "Quando houver novidades importantes, elas aparecerão aqui.",
}: NotificationEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <BellOff
          aria-hidden="true"
          className="size-5 text-muted-foreground"
        />
      </div>

      <h3 className="text-sm font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
