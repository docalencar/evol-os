export type DevelopmentTemplateScope =
  | "global"
  | "company"

export type DevelopmentTemplate = {
  id: string

  companyId: string | null

  name: string

  description: string | null

  scope: DevelopmentTemplateScope

  suggestedDurationDays: number | null

  active: boolean

  createdBy: string | null

  createdAt: string

  updatedAt: string
}
