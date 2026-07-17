"use client"

import {
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

import {
  ProductWizard,
  ProductWizardActions,
  ProductWizardFooter,
  ProductWizardProgress,
  ProductWizardStep,
  useProductWizard,
  type ProductWizardStepDefinition,
} from "@/components/product"

import { createPositionAction } from "../../actions/create-position-action"
import { updatePositionAction } from "../../actions/update-position-action"
import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../../types/position"
import {
  employmentTypeOptions,
  hierarchicalLevelOptions,
  statusOptions,
  travelRequirementOptions,
  workModelOptions,
} from "./position-form-options"
import {
  PositionBasicInformationStep,
  PositionBasicInformationSummary,
  PositionOrganizationStep,
  PositionOrganizationSummary,
  PositionReviewStep,
  PositionWorkArrangementStep,
  PositionWorkArrangementSummary,
} from "./steps"
import type {
  DepartmentOption,
  PositionFormPosition,
} from "./types"

type PositionFormProps = {
  companyId: string
  departments: DepartmentOption[]
  position?: PositionFormPosition
  onSuccess?: () => void
  onCancel?: () => void
}

const positionWizardSteps: ProductWizardStepDefinition[] = [
  {
    id: "basic-information",
    title: "Informações básicas",
    description:
      "Defina o nome e a finalidade principal do cargo.",
  },
  {
    id: "organization",
    title: "Estrutura organizacional",
    description:
      "Posicione o cargo na estrutura da empresa.",
  },
  {
    id: "work-arrangement",
    title: "Regime de trabalho",
    description:
      "Configure jornada, modalidade e vínculo profissional.",
  },
  {
    id: "review",
    title: "Revisão",
    description:
      "Confira todas as informações antes de concluir.",
  },
]

export function PositionForm({
  companyId,
  departments,
  position,
  onSuccess,
  onCancel,
}: PositionFormProps) {
  const [isPending, startTransition] =
    useTransition()

  const isEditing = Boolean(position)

  const [name, setName] = useState(
    position?.name ?? ""
  )

  const [description, setDescription] =
    useState(position?.description ?? "")

  const [departmentId, setDepartmentId] =
    useState(position?.department_id ?? "")

  const [
    hierarchicalLevel,
    setHierarchicalLevel,
  ] = useState<PositionHierarchicalLevel>(
    position?.hierarchical_level ?? "analyst"
  )

  const [status, setStatus] =
    useState<PositionStatus>(
      position?.status ?? "active"
    )

  const [
    weeklyWorkloadHours,
    setWeeklyWorkloadHours,
  ] = useState(
    String(
      position?.weekly_workload_hours ?? 44
    )
  )

  const [workModel, setWorkModel] =
    useState<PositionWorkModel>(
      position?.work_model ?? "on_site"
    )

  const [employmentType, setEmploymentType] =
    useState<PositionEmploymentType>(
      position?.employment_type ?? "clt"
    )

  const [
    travelRequirement,
    setTravelRequirement,
  ] = useState<PositionTravelRequirement>(
    position?.travel_requirement ?? "none"
  )

  const selectedDepartment =
    departments.find(
      (department) =>
        department.id === departmentId
    )

  const hierarchicalLevelLabel =
    hierarchicalLevelOptions.find(
      (option) =>
        option.value === hierarchicalLevel
    )?.label ?? "Não informado"

  const statusLabel =
    statusOptions.find(
      (option) => option.value === status
    )?.label ?? "Não informado"

  const workModelLabel =
    workModelOptions.find(
      (option) => option.value === workModel
    )?.label ?? "Não informado"

  const employmentTypeLabel =
    employmentTypeOptions.find(
      (option) =>
        option.value === employmentType
    )?.label ?? "Não informado"

  const travelRequirementLabel =
    travelRequirementOptions.find(
      (option) =>
        option.value === travelRequirement
    )?.label ?? "Não informado"

  function handleComplete() {
    const input = {
      name: name.trim(),
      description: description.trim(),
      departmentId:
        departmentId || null,
      hierarchicalLevel,
      status,
      weeklyWorkloadHours,
      workModel,
      employmentType,
      travelRequirement,
    }

    startTransition(async () => {
      const result = position
        ? await updatePositionAction(
            companyId,
            position.id,
            input
          )
        : await createPositionAction(
            companyId,
            input
          )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <ProductWizard
      steps={positionWizardSteps}
      onComplete={handleComplete}
    >
      <div className="shrink-0 pb-4">
        <ProductWizardProgress />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <ProductWizardStep
          id="basic-information"
          title="Informações básicas"
          description="Defina o nome e descreva as responsabilidades do cargo."
          summary={
            <PositionBasicInformationSummary
              name={name}
              description={description}
            />
          }
        >
          <PositionBasicInformationStep
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={
              setDescription
            }
          />
        </ProductWizardStep>

        <ProductWizardStep
          id="organization"
          title="Estrutura organizacional"
          description="Defina departamento, nível hierárquico e status."
          summary={
            <PositionOrganizationSummary
              departmentName={
                selectedDepartment?.name
              }
              hierarchicalLevelLabel={
                hierarchicalLevelLabel
              }
              statusLabel={statusLabel}
            />
          }
        >
          <PositionOrganizationStep
            departments={departments}
            departmentId={departmentId}
            hierarchicalLevel={
              hierarchicalLevel
            }
            status={status}
            onDepartmentIdChange={
              setDepartmentId
            }
            onHierarchicalLevelChange={
              setHierarchicalLevel
            }
            onStatusChange={setStatus}
          />
        </ProductWizardStep>

        <ProductWizardStep
          id="work-arrangement"
          title="Regime de trabalho"
          description="Configure a jornada e as condições de contratação."
          summary={
            <PositionWorkArrangementSummary
              weeklyWorkloadHours={
                weeklyWorkloadHours
              }
              workModelLabel={
                workModelLabel
              }
              employmentTypeLabel={
                employmentTypeLabel
              }
              travelRequirementLabel={
                travelRequirementLabel
              }
            />
          }
        >
          <PositionWorkArrangementStep
            weeklyWorkloadHours={
              weeklyWorkloadHours
            }
            workModel={workModel}
            employmentType={
              employmentType
            }
            travelRequirement={
              travelRequirement
            }
            onWeeklyWorkloadHoursChange={
              setWeeklyWorkloadHours
            }
            onWorkModelChange={
              setWorkModel
            }
            onEmploymentTypeChange={
              setEmploymentType
            }
            onTravelRequirementChange={
              setTravelRequirement
            }
          />
        </ProductWizardStep>

        <ProductWizardStep
          id="review"
          title="Revisão"
          description="Confira os dados antes de salvar."
          summary="Cargo pronto para conclusão"
        >
          <PositionReviewStep
            name={name}
            description={description}
            departmentName={
              selectedDepartment?.name
            }
            hierarchicalLevelLabel={
              hierarchicalLevelLabel
            }
            statusLabel={statusLabel}
            weeklyWorkloadHours={
              weeklyWorkloadHours
            }
            workModelLabel={
              workModelLabel
            }
            employmentTypeLabel={
              employmentTypeLabel
            }
            travelRequirementLabel={
              travelRequirementLabel
            }
            isEditing={isEditing}
          />
        </ProductWizardStep>
      </div>

      <PositionWizardFooter
        name={name}
        description={description}
        weeklyWorkloadHours={
          weeklyWorkloadHours
        }
        isPending={isPending}
        isEditing={isEditing}
        onCancel={onCancel}
      />
    </ProductWizard>
  )
}

type PositionWizardFooterProps = {
  name: string
  description: string
  weeklyWorkloadHours: string
  isPending: boolean
  isEditing: boolean
  onCancel?: () => void
}

function PositionWizardFooter({
  name,
  description,
  weeklyWorkloadHours,
  isPending,
  isEditing,
  onCancel,
}: PositionWizardFooterProps) {
  const { currentStepId } =
    useProductWizard()

  function validateCurrentStep() {
    if (
      currentStepId ===
      "basic-information"
    ) {
      const normalizedName = name.trim()
      const normalizedDescription =
        description.trim()

      if (normalizedName.length < 2) {
        toast.error(
          "O nome do cargo deve ter pelo menos 2 caracteres."
        )
        return false
      }

      if (normalizedName.length > 100) {
        toast.error(
          "O nome do cargo deve ter no máximo 100 caracteres."
        )
        return false
      }

      if (
        normalizedDescription.length > 255
      ) {
        toast.error(
          "A descrição deve ter no máximo 255 caracteres."
        )
        return false
      }
    }

    if (
      currentStepId ===
      "work-arrangement"
    ) {
      const workload = Number(
        weeklyWorkloadHours
      )

      if (
        !Number.isInteger(workload) ||
        workload < 1 ||
        workload > 168
      ) {
        toast.error(
          "A carga horária semanal deve ser um número inteiro entre 1 e 168 horas."
        )
        return false
      }
    }

    return true
  }

  return (
    <ProductWizardFooter>
      <ProductWizardActions
        onCancel={onCancel}
        onBeforeNext={
          validateCurrentStep
        }
        onBeforeComplete={
          validateCurrentStep
        }
        completeLabel={
          isEditing
            ? "Salvar alterações"
            : "Criar cargo"
        }
        isPending={isPending}
      />
    </ProductWizardFooter>
  )
}

export type {
  DepartmentOption,
  PositionFormPosition,
} from "./types"
