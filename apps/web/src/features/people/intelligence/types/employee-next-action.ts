export type EmployeeNextActionType =
  | "create-development-plan"
  | "schedule-one-on-one"
  | "request-feedback"
  | "start-assessment"
  | "develop-competency"
  | "review-development-plan"

export type EmployeeNextAction = {
  id: string
  title: string
  description: string
  type: EmployeeNextActionType
  priority: "high" | "medium" | "low"
}
