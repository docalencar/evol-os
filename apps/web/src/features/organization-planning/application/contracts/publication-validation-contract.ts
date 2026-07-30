export type PublicationValidationIssue = Readonly<{
  code: string
  message: string
  changeSetId?: string
}>

export type PublicationValidationResult = Readonly<{
  valid: boolean
  errors: readonly PublicationValidationIssue[]
  warnings: readonly PublicationValidationIssue[]
}>

export type ValidateScenarioPublicationInput = Readonly<{
  companyId: string
  scenarioId: string
  expectedVersion: number
}>
