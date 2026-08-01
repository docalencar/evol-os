export type DecisionFeedSource =
  | "kpi"
  | "planning"
  | "activity"
  | "recruitment"
  | "organization"
  | "system"

export type DecisionFeedCategory =
  | "alert"
  | "scenario"
  | "execution"
  | "organization"
  | "people"
  | "approval"
  | "recommendation"

export type DecisionFeedPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"

export type DecisionFeedBadgeViewModel = Readonly<{
  id: string
  label: string
}>

export type DecisionFeedItemDTO = Readonly<{
  id: string
  source: DecisionFeedSource
  category: DecisionFeedCategory
  priority: DecisionFeedPriority
  title: string
  description: string
  occurredAt: string | null
  href: string | null
  badges: readonly string[]
}>

export type DecisionFeedDTO = Readonly<{
  generatedAt: string
  items: readonly DecisionFeedItemDTO[]
}>

export type DecisionFeedItemViewModel = Readonly<{
  id: string
  source: DecisionFeedSource
  sourceLabel: string
  category: DecisionFeedCategory
  categoryLabel: string
  priority: DecisionFeedPriority
  priorityLabel: string
  title: string
  description: string
  occurredAt: string | null
  occurredAtLabel: string
  href: string | null
  badges: readonly DecisionFeedBadgeViewModel[]
}>

export type DecisionFeedViewModel = Readonly<{
  title: string
  description: string
  generatedAtLabel: string
  isEmpty: boolean
  items: readonly DecisionFeedItemViewModel[]
}>