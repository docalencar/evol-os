export type AiInstruction = {
  objective: string

  context: string[]

  rules: string[]

  expectedOutput: string

  notes?: string[]
}