import type { KPIDashboardViewModel } from "@/features/kpi-dashboard"

import type { ExecutiveOverview } from "./executive-overview"

export type ExecutiveHealthStatus =
  | "healthy"
  | "attention"
  | "critical"

export type ExecutiveHomeDTO = Readonly<{
  generatedAt: string
  overview: ExecutiveOverview
  dashboard: KPIDashboardViewModel
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
  dashboard: KPIDashboardViewModel
  isEmpty: boolean
}>