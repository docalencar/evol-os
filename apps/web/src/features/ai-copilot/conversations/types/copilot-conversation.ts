export type CopilotConversationContextType =
  | "global"
  | "employee"
  | "position"
  | "department"
  | "team"
  | "assessment"
  | "development-plan"
  | "recruitment"
  | "payroll"
  | "executive-dashboard"

export type CopilotConversationStatus =
  | "active"
  | "archived"

export type CopilotConversation = {
  id: string
  companyId: string
  createdBy: string
  title: string
  contextType: CopilotConversationContextType
  contextId: string | null
  status: CopilotConversationStatus
  createdAt: string
  updatedAt: string
}
