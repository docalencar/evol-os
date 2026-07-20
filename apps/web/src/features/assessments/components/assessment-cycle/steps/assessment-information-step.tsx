import {
  ProductWizardHelp,
  ProductWizardSummary,
} from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  assessmentCycleStatusOptions,
  assessmentCycleTypeOptions,
} from "../../../constants/assessment-cycle-options"
import type {
  AssessmentCycleStatus,
  AssessmentCycleType,
} from "../../../types/assessment-cycle"
import type { AssessmentTemplate } from "../../../types/assessment-template"

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const textareaClassName =
  "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

type AssessmentInformationStepProps = {
  templates: AssessmentTemplate[]
  name: string
  description: string
  assessmentTemplateId: string
  assessmentType: AssessmentCycleType
  status: AssessmentCycleStatus
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onAssessmentTemplateIdChange: (value: string) => void
  onAssessmentTypeChange: (value: AssessmentCycleType) => void
  onStatusChange: (value: AssessmentCycleStatus) => void
}

export function AssessmentInformationStep({
  templates,
  name,
  description,
  assessmentTemplateId,
  assessmentType,
  status,
  onNameChange,
  onDescriptionChange,
  onAssessmentTemplateIdChange,
  onAssessmentTypeChange,
  onStatusChange,
}: AssessmentInformationStepProps) {
  const activeTemplates = templates.filter(
    (template) =>
      template.active &&
      template.status === "active"
  )

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="assessment-cycle-name">
          Nome da avaliação
        </Label>

        <Input
          id="assessment-cycle-name"
          value={name}
          onChange={(event) =>
            onNameChange(event.target.value)
          }
          placeholder="Ex.: Avaliação de Desempenho 2026"
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-cycle-description">
          Objetivo
        </Label>

        <textarea
          id="assessment-cycle-description"
          className={textareaClassName}
          value={description}
          onChange={(event) =>
            onDescriptionChange(event.target.value)
          }
          placeholder="Explique rapidamente o objetivo deste ciclo."
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessment-cycle-template">
          Modelo de avaliação
        </Label>

        <select
          id="assessment-cycle-template"
          className={selectClassName}
          value={assessmentTemplateId}
          onChange={(event) =>
            onAssessmentTemplateIdChange(
              event.target.value
            )
          }
          disabled={activeTemplates.length === 0}
        >
          <option value="">
            Selecione um modelo
          </option>

          {activeTemplates.map((template) => (
            <option
              key={template.id}
              value={template.id}
            >
              {template.name}
            </option>
          ))}
        </select>

        {activeTemplates.length === 0 ? (
          <p className="text-sm text-amber-600">
            Crie e ative um modelo antes de cadastrar o ciclo.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            O modelo define as perguntas e seções utilizadas.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessment-cycle-type">
            Tipo
          </Label>

          <select
            id="assessment-cycle-type"
            className={selectClassName}
            value={assessmentType}
            onChange={(event) =>
              onAssessmentTypeChange(
                event.target.value as AssessmentCycleType
              )
            }
          >
            {assessmentCycleTypeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessment-cycle-status">
            Situação inicial
          </Label>

          <select
            id="assessment-cycle-status"
            className={selectClassName}
            value={status}
            onChange={(event) =>
              onStatusChange(
                event.target.value as AssessmentCycleStatus
              )
            }
          >
            {assessmentCycleStatusOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ProductWizardHelp label="Como escolher?">
        O modelo define o conteúdo da avaliação. O tipo ajuda o RH a
        organizar os ciclos e interpretar os relatórios.
      </ProductWizardHelp>
    </div>
  )
}

type AssessmentInformationSummaryProps = {
  name: string
  templateName?: string
}

export function AssessmentInformationSummary({
  name,
  templateName,
}: AssessmentInformationSummaryProps) {
  return (
    <ProductWizardSummary>
      <p className="font-medium">
        {name || "Avaliação ainda sem nome"}
      </p>

      <p className="text-xs">
        {templateName || "Modelo ainda não selecionado"}
      </p>
    </ProductWizardSummary>
  )
}
