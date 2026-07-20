export type CopilotMessageViewModel = {
  id: string
  role: string
  content: string
  status: string
  createdAt: string
}

export type CopilotConversationViewModel = {
  id: string
  title: string
  status: string
  messages: CopilotMessageViewModel[]
}
