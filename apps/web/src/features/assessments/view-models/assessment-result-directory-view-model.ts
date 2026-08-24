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

export type AssessmentCycleResultGroupViewModel = Readonly<{
  cycleId: string
  cycleName: string
  modelName: string
  dateLabel: string
  results: ReadonlyArray<AssessmentResultDirectoryCardViewModel>
}>

export type AssessmentResultDirectoryViewModel = Readonly<{
  cycles: ReadonlyArray<AssessmentCycleResultGroupViewModel>
  isEmpty: boolean
}>
