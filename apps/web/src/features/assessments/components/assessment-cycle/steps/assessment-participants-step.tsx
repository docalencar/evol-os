import {
  ProductWizardHelp,
  ProductWizardSummary,
} from "@/components/product"

type AssessmentParticipantsStepProps = {
  allowSelfAssessment: boolean
  allowManagerAssessment: boolean
  allowPeerAssessment: boolean
  allowDirectReportAssessment: boolean
  onAllowSelfAssessmentChange: (value: boolean) => void
  onAllowManagerAssessmentChange: (value: boolean) => void
  onAllowPeerAssessmentChange: (value: boolean) => void
  onAllowDirectReportAssessmentChange: (value: boolean) => void
}

export function AssessmentParticipantsStep({
  allowSelfAssessment,
  allowManagerAssessment,
  allowPeerAssessment,
  allowDirectReportAssessment,
  onAllowSelfAssessmentChange,
  onAllowManagerAssessmentChange,
  onAllowPeerAssessmentChange,
  onAllowDirectReportAssessmentChange,
}: AssessmentParticipantsStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <ParticipantCard
          title="Autoavaliação"
          description="A própria pessoa avalia seu desempenho."
          checked={allowSelfAssessment}
          onCheckedChange={onAllowSelfAssessmentChange}
        />

        <ParticipantCard
          title="Avaliação pelo gestor"
          description="A liderança direta avalia a pessoa."
          checked={allowManagerAssessment}
          onCheckedChange={onAllowManagerAssessmentChange}
        />

        <ParticipantCard
          title="Avaliação por pares"
          description="Colegas de trabalho também participam."
          checked={allowPeerAssessment}
          onCheckedChange={onAllowPeerAssessmentChange}
        />

        <ParticipantCard
          title="Avaliação por liderados"
          description="Pessoas lideradas avaliam sua liderança."
          checked={allowDirectReportAssessment}
          onCheckedChange={onAllowDirectReportAssessmentChange}
        />
      </div>

      <ProductWizardHelp label="Quem deve participar?">
        Selecione as perspectivas necessárias para este processo. Pelo
        menos uma opção precisa permanecer ativa.
      </ProductWizardHelp>
    </div>
  )
}

type ParticipantCardProps = {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}

function ParticipantCard({
  title,
  description,
  checked,
  onCheckedChange,
}: ParticipantCardProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onCheckedChange(event.target.checked)
        }
        className="mt-1 h-4 w-4 rounded border-input"
      />

      <span className="space-y-1">
        <span className="block text-sm font-medium">
          {title}
        </span>

        <span className="block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

export function getAssessmentParticipantLabels({
  allowSelfAssessment,
  allowManagerAssessment,
  allowPeerAssessment,
  allowDirectReportAssessment,
}: {
  allowSelfAssessment: boolean
  allowManagerAssessment: boolean
  allowPeerAssessment: boolean
  allowDirectReportAssessment: boolean
}) {
  return [
    allowSelfAssessment ? "Autoavaliação" : null,
    allowManagerAssessment ? "Gestores" : null,
    allowPeerAssessment ? "Pares" : null,
    allowDirectReportAssessment ? "Liderados" : null,
  ].filter((value): value is string => Boolean(value))
}

type AssessmentParticipantsSummaryProps = {
  labels: string[]
}

export function AssessmentParticipantsSummary({
  labels,
}: AssessmentParticipantsSummaryProps) {
  return (
    <ProductWizardSummary>
      {labels.length > 0
        ? labels.join(", ")
        : "Nenhuma origem selecionada"}
    </ProductWizardSummary>
  )
}
