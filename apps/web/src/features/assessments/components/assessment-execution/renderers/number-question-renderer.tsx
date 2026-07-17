"use client"

type NumberQuestionRendererProps = {
  value: number | null
  min?: number
  max?: number
  disabled?: boolean
  onChange: (value: number | null) => void
}

export function NumberQuestionRenderer({
  value,
  min,
  max,
  disabled = false,
  onChange,
}: NumberQuestionRendererProps) {
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      disabled={disabled}
      placeholder="Informe um valor."
      onChange={(event) => {
        const rawValue = event.target.value

        onChange(
          rawValue === ""
            ? null
            : Number(rawValue)
        )
      }}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    />
  )
}
