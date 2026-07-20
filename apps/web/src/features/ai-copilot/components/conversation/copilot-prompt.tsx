"use client"

import {
  FormEvent,
  useState,
} from "react"

type CopilotPromptProps = {
  isPending: boolean
  onSubmit(prompt: string): void
}

export function CopilotPrompt({
  isPending,
  onSubmit,
}: CopilotPromptProps) {
  const [
    prompt,
    setPrompt,
  ] = useState("")

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const normalizedPrompt =
      prompt.trim()

    if (
      normalizedPrompt.length === 0 ||
      isPending
    ) {
      return
    }

    onSubmit(normalizedPrompt)
    setPrompt("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-card p-4"
    >
      <label
        htmlFor="copilot-prompt"
        className="sr-only"
      >
        Pergunte ao AI Copilot
      </label>

      <textarea
        id="copilot-prompt"
        name="prompt"
        rows={3}
        value={prompt}
        disabled={isPending}
        onChange={(event) =>
          setPrompt(event.target.value)
        }
        placeholder="Pergunte sobre pessoas, indicadores, riscos ou desenvolvimento..."
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {isPending
            ? "O Evol AI está processando sua solicitação."
            : "Use o contexto da organização para fazer perguntas ao Evol AI."}
        </p>

        <button
          type="submit"
          disabled={
            isPending ||
            prompt.trim().length === 0
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Enviando..."
            : "Enviar"}
        </button>
      </div>
    </form>
  )
}
