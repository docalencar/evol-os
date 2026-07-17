"use client"

type TextQuestionRendererProps = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onBlur: () => void
}

export function TextQuestionRenderer({
  value,
  disabled = false,
  onChange,
  onBlur,
}: TextQuestionRendererProps) {
  return (
    <textarea
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      onBlur={onBlur}
      disabled={disabled}
      maxLength={5000}
      placeholder="Digite sua resposta."
      className="min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    />
  )
}
