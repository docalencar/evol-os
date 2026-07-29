export type PlanningTimelineColor =
  | "slate"
  | "blue"
  | "amber"
  | "green"
  | "red"

export type PlanningTimelineBadgeViewModel = Readonly<{
  id: string
  label: string
  color: PlanningTimelineColor
}>

export type PlanningTimelineItemViewModel = Readonly<{
  id: string
  version: number
  name: string
  status: string
  statusLabel: string
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  publishedAt: string | null
  publishedAtLabel: string | null
  author: string | null
  baselineVersion: number | null
  baselineVersionLabel: string
  summary: string
  badges: readonly PlanningTimelineBadgeViewModel[]
  current: boolean
  published: boolean
}>

export type PlanningTimelineViewModel = Readonly<{
  workspaceId: string
  items: readonly PlanningTimelineItemViewModel[]
  isEmpty: boolean
}>
