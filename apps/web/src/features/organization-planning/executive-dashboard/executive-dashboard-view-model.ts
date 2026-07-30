export type ExecutiveMetricViewModel = Readonly<{
  id: string
  label: string
  valueLabel: string
  contextLabel: string | null
  color: string
  icon: string
}>

export type ExecutiveAlertViewModel = Readonly<{
  id: string
  title: string
  description: string
  category: string
  badge: string
  color: string
  icon: string
}>

export type ExecutiveImpactViewModel = Readonly<{
  id: string
  label: string
  totalLabel: string
  isEmpty: boolean
}>

export type ExecutiveDashboardViewModel = Readonly<{
  scenario: Readonly<{ id: string; workspaceId: string; name: string; status: string; version: number }>
  summary: Readonly<{ headline: string; riskLabel: string; color: string; icon: string }>
  headcount: ExecutiveMetricViewModel | null
  metrics: readonly ExecutiveMetricViewModel[]
  alerts: readonly ExecutiveAlertViewModel[]
  impacts: readonly ExecutiveImpactViewModel[]
  generatedAt: string
  isEmpty: boolean
}>
