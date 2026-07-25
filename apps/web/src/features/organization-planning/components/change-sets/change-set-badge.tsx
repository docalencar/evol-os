import { Badge } from "@/components/ui/badge"

import type { ChangeSetAction } from "./change-set-description"

type ChangeSetBadgeProps = Readonly<{
  action: ChangeSetAction
  label: string
}>

const ACTION_CLASS_NAMES: Record<
  ChangeSetAction,
  string
> = {
  create:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  update:
    "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  move:
    "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  terminate:
    "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  archive:
    "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  unknown:
    "border border-border bg-muted text-muted-foreground",
}

export function ChangeSetBadge({
  action,
  label,
}: ChangeSetBadgeProps) {
  return (
    <Badge className={ACTION_CLASS_NAMES[action]}>
      {label}
    </Badge>
  )
}
