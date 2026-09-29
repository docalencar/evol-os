import type { KPIDashboardViewModel } from "@/features/kpi-dashboard"

import type {
  DecisionFeedDTO,
  DecisionFeedViewModel,
} from "../decision-feed"
import type { ExecutiveOverview } from "./executive-overview"

export type ExecutiveHealthStatus =
  | "healthy"
  | "attention"
  | "critical"
  | "partial"

export type ExecutiveSourceFailure = Readonly<{
  source: string
  kind: "failure" | "unavailable"
  message: string
}>

export type ExecutiveHomeDTO = Readonly<{
  generatedAt: string
  overview: ExecutiveOverview
  dashboard: KPIDashboardViewModel
  decisionFeed: DecisionFeedDTO
  sourceFailures: readonly ExecutiveSourceFailure[]
}>

export type ExecutiveBriefViewModel = Readonly<{
  title: string
  description: string
  status: ExecutiveHealthStatus
  statusLabel: string
  generatedAtLabel: string
  totalEmployeesLabel: string
  criticalEmployeesLabel: string
  organizationalRisksLabel: string
  aiSuggestionsLabel: string
  alertCountLabel: string
}>

export type ExecutiveNarrativeViewModel = Readonly<{
  title: string
  body: string
  status: ExecutiveHealthStatus
  statusLabel: string
}>

export type ExecutiveHomeViewModel = Readonly<{
  brief: ExecutiveBriefViewModel
  narrative: ExecutiveNarrativeViewModel
  decisionFeed: DecisionFeedViewModel
  dashboard: KPIDashboardViewModel
  dataStatus: "complete" | "partial"
  sourceFailures: readonly Readonly<{
    source: string
    sourceLabel: string
    kind: "failure" | "unavailable"
  }>[]
  isEmpty: boolean
}>
