"use client"

type BooleanQuestionRendererProps = {
  value: boolean | null
  disabled?: boolean
  onChange: (value: boolean) => void
}

export function BooleanQuestionRenderer({
  value,
  disabled = false,
  onChange,
}: BooleanQuestionRendererProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        {
          label: "Sim",
          value: true,
        },
        {
          label: "Não",
          value: false,
        },
      ].map((option) => {
        const selected = value === option.value

        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={[
              "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-primary hover:bg-primary/5",
            ].join(" ")}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
