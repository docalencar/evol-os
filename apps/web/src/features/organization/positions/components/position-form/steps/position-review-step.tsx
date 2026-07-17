import type { ReactNode } from "react"
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
} from "lucide-react"

import {
  ProductWizardHelp,
} from "@/components/product"

type PositionReviewItemProps = {
  label: string
  value: string
  icon: ReactNode
}

function PositionReviewItem({
  label,
  value,
  icon,
}: PositionReviewItemProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {icon}
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>

          <p className="break-words text-sm font-medium">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

type PositionReviewStepProps = {
  name: string
  description: string
  departmentName?: string
  hierarchicalLevelLabel: string
  statusLabel: string
  weeklyWorkloadHours: string
  workModelLabel: string
  employmentTypeLabel: string
  travelRequirementLabel: string
  isEditing: boolean
}

export function PositionReviewStep({
  name,
  description,
  departmentName,
  hierarchicalLevelLabel,
  statusLabel,
  weeklyWorkloadHours,
  workModelLabel,
  employmentTypeLabel,
  travelRequirementLabel,
  isEditing,
}: PositionReviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Cargo pronto para revisão
            </p>

            <p className="text-sm leading-6 text-muted-foreground">
              Confira as informações antes de{" "}
              {isEditing
                ? "salvar as alterações."
                : "criar o cargo na organização."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PositionReviewItem
          label="Cargo"
          value={
            name.trim() ||
            "Nome não informado"
          }
          icon={
            <BriefcaseBusiness className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Departamento"
          value={
            departmentName ||
            "Sem departamento"
          }
          icon={
            <Building2 className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Nível hierárquico"
          value={hierarchicalLevelLabel}
          icon={
            <BriefcaseBusiness className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Status"
          value={statusLabel}
          icon={
            <CheckCircle2 className="h-4 w-4" />
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PositionReviewItem
          label="Carga horária"
          value={`${weeklyWorkloadHours || "0"} horas semanais`}
          icon={
            <Clock3 className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Modalidade"
          value={workModelLabel}
          icon={
            <BriefcaseBusiness className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Regime contratual"
          value={employmentTypeLabel}
          icon={
            <BriefcaseBusiness className="h-4 w-4" />
          }
        />

        <PositionReviewItem
          label="Viagens"
          value={travelRequirementLabel}
          icon={
            <BriefcaseBusiness className="h-4 w-4" />
          }
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Descrição
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {description.trim() ||
            "Nenhuma descrição informada."}
        </p>
      </div>

      {!departmentName ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-sm leading-5">
            O cargo não está vinculado a um departamento. Isso pode limitar
            análises e visualizações da estrutura organizacional.
          </p>
        </div>
      ) : null}

      {!description.trim() ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-sm leading-5">
            Nenhuma descrição foi adicionada. Uma descrição clara ajuda na
            definição de responsabilidades, competências e expectativas.
          </p>
        </div>
      ) : null}

      <ProductWizardHelp label="O que acontece depois?">
        {isEditing
          ? "As alterações serão refletidas no cadastro do cargo e nas áreas relacionadas da organização."
          : "O cargo será criado e poderá receber colaboradores, competências e requisitos profissionais."}
      </ProductWizardHelp>
    </div>
  )
}
