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
    <div className="flex flex-wrap gap-2">
      {values.map((optionValue) => {
        const selected = optionValue === value

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            disabled={disabled}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-primary hover:bg-primary/10",
            ].join(" ")}
          >
            {optionValue}
          </button>
        )
      })}
    </div>
  )
}
