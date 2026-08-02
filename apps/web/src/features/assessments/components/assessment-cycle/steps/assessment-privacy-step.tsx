import {
  ProductWizardHelp,
  ProductWizardSummary,
} from "@/components/product"
import { Label } from "@/components/ui/label"

import { assessmentVisibilityOptions } from "../../../constants/assessment-cycle-options"
import type { AssessmentVisibility } from "../../../types/assessment-cycle"

type AssessmentPrivacyStepProps = {
  anonymous: boolean
  onAnonymousChange: (value: boolean) => void
  assessmentVisibility: AssessmentVisibility
  onAssessmentVisibilityChange: (value: AssessmentVisibility) => void
}

export function AssessmentPrivacyStep({
  anonymous,
  onAnonymousChange,
  assessmentVisibility,
  onAssessmentVisibilityChange,
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

      <div className="space-y-2 rounded-lg border p-4">
        <Label htmlFor="assessment-visibility">
          O que o avaliado poderá ver?
        </Label>

        <select
          id="assessment-visibility"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={assessmentVisibility}
          onChange={(event) =>
            onAssessmentVisibilityChange(
              event.target.value as AssessmentVisibility
            )
          }
        >
          {assessmentVisibilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="text-sm leading-5 text-muted-foreground">
          Essa configuração controla o resultado apresentado ao avaliado depois
          do envio. Ela nunca concede acesso às respostas em elaboração.
        </p>
      </div>

      <ProductWizardHelp label="Como funciona a privacidade?">
        A proteção da identidade pode incentivar respostas mais
        sinceras, principalmente nas avaliações por pares e liderados.
      </ProductWizardHelp>
    </div>
  )
}

type AssessmentPrivacySummaryProps = {
  anonymous: boolean
  assessmentVisibilityLabel: string
}

export function AssessmentPrivacySummary({
  anonymous,
  assessmentVisibilityLabel,
}: AssessmentPrivacySummaryProps) {
  return (
    <ProductWizardSummary>
      {anonymous ? "Identidade protegida" : "Identidade visível"}
      {` · ${assessmentVisibilityLabel}`}
    </ProductWizardSummary>
  )
}
