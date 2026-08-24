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
    <div
      className="grid gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Resposta sim ou não"
    >
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
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={[
              "rounded-lg border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-2 border-primary bg-primary/15 font-bold text-primary ring-2 ring-primary/40 ring-offset-2"
                : disabled
                  ? "cursor-not-allowed font-medium opacity-60"
                  : "font-medium hover:border-primary hover:bg-primary/5",
            ].join(" ")}
          >
            {option.label}
            {selected ? (
              <span className="sr-only"> selecionado</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
