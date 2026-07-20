import {
  ProductWizardHelp,
  ProductWizardSummary,
} from "@/components/product"

type AssessmentPrivacyStepProps = {
  anonymous: boolean
  onAnonymousChange: (value: boolean) => void
}

export function AssessmentPrivacyStep({
  anonymous,
  onAnonymousChange,
}: AssessmentPrivacyStepProps) {
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) =>
            onAnonymousChange(event.target.checked)
          }
          className="mt-1 h-4 w-4 rounded border-input"
        />

        <span className="space-y-1">
          <span className="block text-sm font-medium">
            Proteger a identidade dos avaliadores
          </span>

          <span className="block text-sm leading-5 text-muted-foreground">
            A identidade poderá ser ocultada na apresentação dos
            resultados.
          </span>
        </span>
      </label>

      <ProductWizardHelp label="Como funciona a privacidade?">
        A proteção da identidade pode incentivar respostas mais
        sinceras, principalmente nas avaliações por pares e liderados.
      </ProductWizardHelp>
    </div>
  )
}

type AssessmentPrivacySummaryProps = {
  anonymous: boolean
}

export function AssessmentPrivacySummary({
  anonymous,
}: AssessmentPrivacySummaryProps) {
  return (
    <ProductWizardSummary>
      {anonymous
        ? "Identidade dos avaliadores protegida"
        : "Identidade dos avaliadores visível"}
    </ProductWizardSummary>
  )
}
