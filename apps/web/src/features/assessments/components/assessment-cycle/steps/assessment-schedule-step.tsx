import {
  ProductWizardHelp,
  ProductWizardSummary,
} from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function parseLocalDate(value: string) {
  if (!value) {
    return null
  }

  const [year, month, day] = value
    .split("-")
    .map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

export function formatAssessmentDate(value: string) {
  const date = parseLocalDate(value)

  if (!date) {
    return "Não definido"
  }

  return new Intl.DateTimeFormat("pt-BR").format(date)
}

function calculateDaysBetween(
  start: string,
  end: string
) {
  const startDate = parseLocalDate(start)
  const endDate = parseLocalDate(end)

  if (!startDate || !endDate) {
    return null
  }

  return Math.round(
    (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

type AssessmentScheduleStepProps = {
  startDate: string
  endDate: string
  closeDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onCloseDateChange: (value: string) => void
}

export function AssessmentScheduleStep({
  startDate,
  endDate,
  closeDate,
  onStartDateChange,
  onEndDateChange,
  onCloseDateChange,
}: AssessmentScheduleStepProps) {
  const responsePeriodDays =
    calculateDaysBetween(startDate, endDate)

  const closingPeriodDays =
    calculateDaysBetween(endDate, closeDate)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="assessment-start-date">
          Início das respostas
        </Label>

        <Input
          id="assessment-start-date"
          type="date"
          value={startDate}
          onChange={(event) =>
            onStartDateChange(event.target.value)
          }
        />

        <p className="text-sm text-muted-foreground">
          Quando os participantes poderão começar a responder.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-end-date">
          Prazo para responder
        </Label>

        <Input
          id="assessment-end-date"
          type="date"
          value={endDate}
          min={startDate || undefined}
          disabled={!startDate}
          onChange={(event) =>
            onEndDateChange(event.target.value)
          }
        />

        <p className="text-sm text-muted-foreground">
          {startDate
            ? "Depois dessa data, novas respostas não serão aceitas."
            : "Defina primeiro o início das respostas."}
        </p>

        {responsePeriodDays !== null ? (
          <p className="text-sm font-medium">
            {responsePeriodDays === 0
              ? "As respostas acontecerão no mesmo dia."
              : `${responsePeriodDays} dia(s) para responder.`}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-close-date">
          Fechamento da avaliação
          <span className="ml-1 font-normal text-muted-foreground">
            (opcional)
          </span>
        </Label>

        <Input
          id="assessment-close-date"
          type="date"
          value={closeDate}
          min={endDate || undefined}
          disabled={!endDate}
          onChange={(event) =>
            onCloseDateChange(event.target.value)
          }
        />

        <p className="text-sm text-muted-foreground">
          {endDate
            ? "Quando o RH encerrará o ciclo e consolidará os resultados."
            : "Defina primeiro o prazo para responder."}
        </p>

        {closingPeriodDays !== null ? (
          <p className="text-sm font-medium">
            {closingPeriodDays === 0
              ? "Fechamento no mesmo dia do prazo."
              : `${closingPeriodDays} dia(s) entre o prazo e o fechamento.`}
          </p>
        ) : null}
      </div>

      <ProductWizardHelp label="Como organizar o cronograma?">
        Defina primeiro o início, depois o prazo dos participantes.
        O fechamento representa o encerramento administrativo pelo RH.
      </ProductWizardHelp>
    </div>
  )
}

type AssessmentScheduleSummaryProps = {
  startDate: string
  endDate: string
  closeDate: string
}

export function AssessmentScheduleSummary({
  startDate,
  endDate,
  closeDate,
}: AssessmentScheduleSummaryProps) {
  return (
    <ProductWizardSummary>
      <p className="font-medium">
        {formatAssessmentDate(startDate)}
        {" → "}
        {formatAssessmentDate(endDate)}
      </p>

      <p className="text-xs">
        Fechamento: {formatAssessmentDate(closeDate)}
      </p>
    </ProductWizardSummary>
  )
}
