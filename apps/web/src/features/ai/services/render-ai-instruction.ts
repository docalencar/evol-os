import type {
  AiInstruction,
} from "../types/ai-instruction"

function renderSection(
  title: string,
  items: string[]
) {
  if (items.length === 0) {
    return ""
  }

  return [
    title,
    ...items.map(
      (item) => `- ${item}`
    ),
    "",
  ].join("\n")
}

export function renderAiInstruction(
  instruction: AiInstruction
): string {
  return [
    "# Objetivo",
    instruction.objective,
    "",

    renderSection(
      "# Contexto",
      instruction.context
    ),

    renderSection(
      "# Regras",
      instruction.rules
    ),

    "# Formato esperado",

    instruction.expectedOutput,

    "",

    renderSection(
      "# Observações",
      instruction.notes ?? []
    ),
  ]
    .filter(Boolean)
    .join("\n")
}
