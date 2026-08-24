"use client"

type ScaleQuestionRendererProps = {
  value: number | null
  min: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function ScaleQuestionRenderer({
  value,
  min,
  max,
  disabled = false,
  onChange,
}: ScaleQuestionRendererProps) {
  const values = Array.from(
    {
      length: Math.max(0, max - min + 1),
    },
    (_, index) => min + index
  )

  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Escala de resposta"
    >
      {values.map((optionValue) => {
        const selected = optionValue === value

        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            disabled={disabled}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-2 border-primary bg-primary font-bold text-primary-foreground ring-2 ring-primary/40 ring-offset-2"
                : disabled
                  ? "cursor-not-allowed font-medium opacity-60"
                  : "font-medium hover:border-primary hover:bg-primary/10",
            ].join(" ")}
          >
            {optionValue}
            {selected ? (
              <span className="sr-only"> selecionado</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
