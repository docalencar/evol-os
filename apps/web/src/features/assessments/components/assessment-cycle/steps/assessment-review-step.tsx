import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

import {
  ProductWizardHelp,
} from "@/components/product"

type ReviewItemProps = {
  label: string
  value: string
}

function ReviewItem({
  label,
  value,
}: ReviewItemProps) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="text-sm font-medium">
        {value}
      </p>
    </div>
  )
}

type AssessmentReviewStepProps = {
  name: string
  templateName?: string
  assessmentTypeLabel: string
  statusLabel: string
  startDateLabel: string
  endDateLabel: string
  closeDateLabel: string
  participantLabels: string[]
  anonymous: boolean
}

export function AssessmentReviewStep({
  name,
  templateName,
  assessmentTypeLabel,
  statusLabel,
  startDateLabel,
  endDateLabel,
  closeDateLabel,
  participantLabels,
  anonymous,
}: AssessmentReviewStepProps) {
  const hasManagerAssessment =
    participantLabels.includes("Gestores")

  const hasMultiplePerspectives =
    participantLabels.length > 1

  const hasClosingDate =
    closeDateLabel !== "Não definido"

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Configuração pronta para revisão
            </p>

            <p className="text-sm leading-5 text-muted-foreground">
              Confira os pontos principais antes de criar o ciclo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem
          label="Avaliação"
          value={
            name || "Nome não informado"
          }
        />

        <ReviewItem
          label="Modelo"
          value={
            templateName ||
            "Modelo não selecionado"
          }
        />

        <ReviewItem
          label="Tipo"
          value={assessmentTypeLabel}
        />

        <ReviewItem
          label="Situação inicial"
          value={statusLabel}
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cronograma
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Início das respostas
            </p>

            <p className="mt-1 text-sm font-medium">
              {startDateLabel}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Prazo para responder
            </p>

            <p className="mt-1 text-sm font-medium">
              {endDateLabel}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Fechamento
            </p>

            <p className="mt-1 text-sm font-medium">
              {closeDateLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem
          label="Quem avalia"
          value={
            participantLabels.length > 0
              ? participantLabels.join(", ")
              : "Nenhuma origem selecionada"
          }
        />

        <ReviewItem
          label="Privacidade"
          value={
            anonymous
              ? "Identidade protegida"
              : "Identidade visível"
          }
        />
      </div>

      {!hasManagerAssessment ? (
        <BusinessNotice>
          A avaliação pelo gestor não está incluída. Confirme se esse formato
          corresponde ao processo definido pelo RH.
        </BusinessNotice>
      ) : null}

      {!hasMultiplePerspectives ? (
        <BusinessNotice>
          Apenas uma perspectiva foi selecionada. O resultado representará uma
          única visão sobre o desempenho da pessoa.
        </BusinessNotice>
      ) : null}

      {!hasClosingDate ? (
        <BusinessNotice>
          O ciclo não possui uma data de fechamento. O RH poderá encerrá-lo
          manualmente após o prazo das respostas.
        </BusinessNotice>
      ) : null}

      <ProductWizardHelp label="O que acontece depois?">
        Ao concluir, o ciclo será criado na situação escolhida. Ciclos em
        rascunho ainda poderão ser revisados antes da abertura das respostas.
      </ProductWizardHelp>
    </div>
  )
}

function BusinessNotice({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

      <p className="text-sm leading-5">
        {children}
      </p>
    </div>
  )
}
