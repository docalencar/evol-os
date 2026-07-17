type NotificationBadgeProps = {
  count: number
  maximumVisibleCount?: number
  className?: string
}

export function NotificationBadge({
  count,
  maximumVisibleCount = 99,
  className = "",
}: NotificationBadgeProps) {
  if (count <= 0) {
    return null
  }

  const label =
    count > maximumVisibleCount
      ? `${maximumVisibleCount}+`
      : String(count)

  return (
    <span
      aria-label={`${count} notificações não lidas`}
      className={[
        "inline-flex min-w-5 items-center justify-center rounded-full",
        "bg-destructive px-1.5 py-0.5 text-[10px] font-semibold",
        "leading-none text-destructive-foreground",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  )
}
