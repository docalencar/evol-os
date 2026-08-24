export type AssessmentResultDirectoryCardViewModel = Readonly<{
  responseId: string
  perspective: "self" | "manager" | "legacy_unknown"
  perspectiveLabel: string
  score: number | null
  scoreLabel: string
  scoreDescription: string | null
  statusLabel: string
  submittedAtLabel: string | null
  href: string
  canOpen: true
}>

export type AssessmentPerspectiveComparisonViewModel = Readonly<{
  self: Readonly<{
    responseId: string
    score: number
    scoreLabel: string
  }>
  manager: Readonly<{
    responseId: string
    score: number
    scoreLabel: string
  }>
  differencePoints: number
  differenceLabel: string
}>

export type AssessmentCycleResultGroupViewModel = Readonly<{
  cycleId: string
  cycleName: string
  modelName: string
  dateLabel: string
  results: ReadonlyArray<AssessmentResultDirectoryCardViewModel>
  comparison: AssessmentPerspectiveComparisonViewModel | null
  comparisonUnavailableMessage: string | null
}>

export type AssessmentResultDirectoryViewModel = Readonly<{
  cycles: ReadonlyArray<AssessmentCycleResultGroupViewModel>
  isEmpty: boolean
}>
