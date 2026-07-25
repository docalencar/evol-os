import type {
  ChangeSetAction,
} from "./change-set-description"

export type ChangeSetActionStyle = Readonly<{
  card: string
  iconContainer: string
  timelineMarker: string
  timelineDot: string
}>

const ACTION_STYLES: Record<
  ChangeSetAction,
  ChangeSetActionStyle
> = {
  create: {
    card:
      "border-l-4 border-l-emerald-500",
    iconContainer:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    timelineMarker:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
    timelineDot:
      "bg-emerald-500",
  },

  update: {
    card:
      "border-l-4 border-l-blue-500",
    iconContainer:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
    timelineMarker:
      "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    timelineDot:
      "bg-blue-500",
  },

  move: {
    card:
      "border-l-4 border-l-amber-500",
    iconContainer:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    timelineMarker:
      "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
    timelineDot:
      "bg-amber-500",
  },

  terminate: {
    card:
      "border-l-4 border-l-red-500",
    iconContainer:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    timelineMarker:
      "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950",
    timelineDot:
      "bg-red-500",
  },

  archive: {
    card:
      "border-l-4 border-l-zinc-500",
    iconContainer:
      "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
    timelineMarker:
      "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
    timelineDot:
      "bg-zinc-500",
  },

  unknown: {
    card:
      "border-l-4 border-l-muted-foreground",
    iconContainer:
      "border-border bg-muted text-muted-foreground",
    timelineMarker:
      "border-border bg-background",
    timelineDot:
      "bg-muted-foreground",
  },
}

export function getChangeSetActionStyle(
  action: ChangeSetAction
): ChangeSetActionStyle {
  return ACTION_STYLES[action]
}
