export type GlobalCopilotContext = {
  companyId: string

  generatedAt: string

  locale: string

  timeZone: string

  user: {
    userId: string | null

    role: string | null

    permissions: string[]
  }

  metadata: Record<string, unknown>
}
