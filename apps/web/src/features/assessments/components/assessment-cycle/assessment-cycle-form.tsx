"use client"

import {
  useRef,
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

import { createAssessmentCycleAction } from "../../actions/create-assessment-cycle-action"
import { updateAssessmentCycleAction } from "../../actions/update-assessment-cycle-action"
import {
  assessmentCycleStatusOptions,
  assessmentCycleTypeOptions,
} from "../../constants/assessment-cycle-options"
import type {
  AssessmentCycle,
  AssessmentCycleStatus,
  AssessmentCycleType,
} from "../../types/assessment-cycle"
import type { AssessmentTemplate } from "../../types/assessment-template"
import {
  AssessmentInformationStep,
  AssessmentInformationSummary,
} from "./steps/assessment-information-step"
import {
  AssessmentParticipantsStep,
  AssessmentParticipantsSummary,
  getAssessmentParticipantLabels,
} from "./steps/assessment-participants-step"
import {
  AssessmentPrivacyStep,
  AssessmentPrivacySummary,
} from "./steps/assessment-privacy-step"
import { AssessmentReviewStep } from "./steps/assessment-review-step"
import {
  AssessmentScheduleStep,
  AssessmentScheduleSummary,
  formatAssessmentDate,
} from "./steps/assessment-schedule-step"

type AssessmentCycleFormProps = {
  companyId: string
  templates: AssessmentTemplate[]
  cycle?: AssessmentCycle
  onSuccess?: () => void
  onCancel?: () => void
}

const wizardSteps: ProductWizardStepDefinition[] = [
  {
    id: "information",
    title: "Informações",
    description:
      "Identifique a avaliação e escolha o modelo utilizado.",
  },
  {
    id: "schedule",
    title: "Cronograma",
    description:
      "Defina o período de respostas e o encerramento.",
  },
  {
    id: "participants",
    title: "Participantes",
    description:
      "Escolha quem poderá participar da avaliação.",
  },
  {
    id: "privacy",
    title: "Privacidade",
    description:
      "Defina como a identidade será tratada.",
  },
  {
    id: "review",
    title: "Revisão",
    description:
      "Confira as configurações antes de concluir.",
  },
]

export function AssessmentCycleForm({
  companyId,
  templates,
  cycle,
  onSuccess,
  onCancel,
}: AssessmentCycleFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] =
    useTransition()

  const [name, setName] = useState(
    cycle?.name ?? ""
  )
  const [description, setDescription] =
    useState(cycle?.description ?? "")
  const [
    assessmentTemplateId,
    setAssessmentTemplateId,
  ] = useState(
    cycle?.assessment_template_id ?? ""
  )
  const [assessmentType, setAssessmentType] =
    useState<AssessmentCycleType>(
      cycle?.assessment_type ?? "performance"
    )
  const [status, setStatus] =
    useState<AssessmentCycleStatus>(
      cycle?.status ?? "draft"
    )

  const [startDate, setStartDate] =
    useState(cycle?.start_date ?? "")
  const [endDate, setEndDate] =
    useState(cycle?.end_date ?? "")
  const [closeDate, setCloseDate] =
    useState(cycle?.close_date ?? "")

  const [
    allowSelfAssessment,
    setAllowSelfAssessment,
  ] = useState(
    cycle?.allow_self_assessment ?? true
  )
  const [
    allowManagerAssessment,
    setAllowManagerAssessment,
  ] = useState(
    cycle?.allow_manager_assessment ?? true
  )
  const [
    allowPeerAssessment,
    setAllowPeerAssessment,
  ] = useState(
    cycle?.allow_peer_assessment ?? false
  )
  const [
    allowDirectReportAssessment,
    setAllowDirectReportAssessment,
  ] = useState(
    cycle?.allow_direct_report_assessment ??
      false
  )
  const [anonymous, setAnonymous] =
    useState(cycle?.anonymous ?? false)

  const activeTemplates = templates.filter(
    (template) =>
      template.active &&
      template.status === "active"
  )

  const selectedTemplate =
    activeTemplates.find(
      (template) =>
        template.id === assessmentTemplateId
    )

  const participantLabels =
    getAssessmentParticipantLabels({
      allowSelfAssessment,
      allowManagerAssessment,
      allowPeerAssessment,
      allowDirectReportAssessment,
    })

  const assessmentTypeLabel =
    assessmentCycleTypeOptions.find(
      (option) =>
        option.value === assessmentType
    )?.label ?? assessmentType

  const statusLabel =
    assessmentCycleStatusOptions.find(
      (option) => option.value === status
    )?.label ?? status

  function handleStartDateChange(
    value: string
  ) {
    setStartDate(value)

    if (endDate && value && endDate < value) {
      setEndDate("")
      setCloseDate("")
      return
    }

    if (
      closeDate &&
      value &&
      closeDate < value
    ) {
      setCloseDate("")
    }
  }

  function handleEndDateChange(
    value: string
  ) {
    setEndDate(value)

    if (
      closeDate &&
      value &&
      closeDate < value
    ) {
      setCloseDate("")
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = cycle
        ? await updateAssessmentCycleAction(
            companyId,
            cycle.id,
            formData
          )
        : await createAssessmentCycleAction(
            companyId,
            formData
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
    <form
      ref={formRef}
      action={handleSubmit}
      className="min-h-0"
    >
      <input type="hidden" name="name" value={name} />
      <input
        type="hidden"
        name="description"
        value={description}
      />
      <input
        type="hidden"
        name="assessmentTemplateId"
        value={assessmentTemplateId}
      />
      <input
        type="hidden"
        name="assessmentType"
        value={assessmentType}
      />
      <input
        type="hidden"
        name="status"
        value={status}
      />
      <input
        type="hidden"
        name="startDate"
        value={startDate}
      />
      <input
        type="hidden"
        name="endDate"
        value={endDate}
      />
      <input
        type="hidden"
        name="closeDate"
        value={closeDate}
      />

      {allowSelfAssessment ? (
        <input
          type="hidden"
          name="allowSelfAssessment"
          value="on"
        />
      ) : null}

      {allowManagerAssessment ? (
        <input
          type="hidden"
          name="allowManagerAssessment"
          value="on"
        />
      ) : null}

      {allowPeerAssessment ? (
        <input
          type="hidden"
          name="allowPeerAssessment"
          value="on"
        />
      ) : null}

      {allowDirectReportAssessment ? (
        <input
          type="hidden"
          name="allowDirectReportAssessment"
          value="on"
        />
      ) : null}

      {anonymous ? (
        <input
          type="hidden"
          name="anonymous"
          value="on"
        />
      ) : null}

      <ProductWizard
        steps={wizardSteps}
        onComplete={() =>
          formRef.current?.requestSubmit()
        }
      >
        <div className="shrink-0 pb-4">
          <ProductWizardProgress />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <ProductWizardStep
            id="information"
            title="Informações"
            description="Identifique a avaliação e escolha o modelo utilizado."
            summary={
              <AssessmentInformationSummary
                name={name}
                templateName={selectedTemplate?.name}
              />
            }
          >
            <AssessmentInformationStep
              templates={templates}
              name={name}
              description={description}
              assessmentTemplateId={
                assessmentTemplateId
              }
              assessmentType={assessmentType}
              status={status}
              onNameChange={setName}
              onDescriptionChange={
                setDescription
              }
              onAssessmentTemplateIdChange={
                setAssessmentTemplateId
              }
              onAssessmentTypeChange={
                setAssessmentType
              }
              onStatusChange={setStatus}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="schedule"
            title="Cronograma"
            description="Defina o período de respostas e o fechamento."
            summary={
              <AssessmentScheduleSummary
                startDate={startDate}
                endDate={endDate}
                closeDate={closeDate}
              />
            }
          >
            <AssessmentScheduleStep
              startDate={startDate}
              endDate={endDate}
              closeDate={closeDate}
              onStartDateChange={
                handleStartDateChange
              }
              onEndDateChange={
                handleEndDateChange
              }
              onCloseDateChange={setCloseDate}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="participants"
            title="Participantes"
            description="Escolha quem poderá avaliar."
            summary={
              <AssessmentParticipantsSummary
                labels={participantLabels}
              />
            }
          >
            <AssessmentParticipantsStep
              allowSelfAssessment={
                allowSelfAssessment
              }
              allowManagerAssessment={
                allowManagerAssessment
              }
              allowPeerAssessment={
                allowPeerAssessment
              }
              allowDirectReportAssessment={
                allowDirectReportAssessment
              }
              onAllowSelfAssessmentChange={
                setAllowSelfAssessment
              }
              onAllowManagerAssessmentChange={
                setAllowManagerAssessment
              }
              onAllowPeerAssessmentChange={
                setAllowPeerAssessment
              }
              onAllowDirectReportAssessmentChange={
                setAllowDirectReportAssessment
              }
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="privacy"
            title="Privacidade"
            description="Defina como a identidade será tratada."
            summary={
              <AssessmentPrivacySummary
                anonymous={anonymous}
              />
            }
          >
            <AssessmentPrivacyStep
              anonymous={anonymous}
              onAnonymousChange={setAnonymous}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="review"
            title="Revisão"
            description="Confira tudo antes de salvar."
            summary="Configuração pronta para conclusão"
          >
            <AssessmentReviewStep
              name={name}
              templateName={
                selectedTemplate?.name
              }
              assessmentTypeLabel={
                assessmentTypeLabel
              }
              statusLabel={statusLabel}
              startDateLabel={
                formatAssessmentDate(startDate)
              }
              endDateLabel={
                formatAssessmentDate(endDate)
              }
              closeDateLabel={
                formatAssessmentDate(closeDate)
              }
              participantLabels={
                participantLabels
              }
              anonymous={anonymous}
            />
          </ProductWizardStep>
        </div>

        <AssessmentCycleWizardFooter
          isPending={isPending}
          isEditing={Boolean(cycle)}
          hasActiveTemplates={
            activeTemplates.length > 0
          }
          name={name}
          assessmentTemplateId={
            assessmentTemplateId
          }
          startDate={startDate}
          endDate={endDate}
          participantCount={
            participantLabels.length
          }
          onCancel={onCancel}
        />
      </ProductWizard>
    </form>
  )
}

type AssessmentCycleWizardFooterProps = {
  isPending: boolean
  isEditing: boolean
  hasActiveTemplates: boolean
  name: string
  assessmentTemplateId: string
  startDate: string
  endDate: string
  participantCount: number
  onCancel?: () => void
}

function AssessmentCycleWizardFooter({
  isPending,
  isEditing,
  hasActiveTemplates,
  name,
  assessmentTemplateId,
  startDate,
  endDate,
  participantCount,
  onCancel,
}: AssessmentCycleWizardFooterProps) {
  const { currentStepId } =
    useProductWizard()

  function validateCurrentStep() {
    if (currentStepId === "information") {
      if (name.trim().length < 2) {
        toast.error(
          "Informe um nome com pelo menos 2 caracteres."
        )
        return false
      }

      if (!assessmentTemplateId) {
        toast.error(
          "Selecione um modelo de avaliação."
        )
        return false
      }
    }

    if (currentStepId === "schedule") {
      if (!startDate) {
        toast.error(
          "Informe quando as respostas começam."
        )
        return false
      }

      if (!endDate) {
        toast.error(
          "Informe o prazo para responder."
        )
        return false
      }

      if (endDate < startDate) {
        toast.error(
          "O prazo deve ser igual ou posterior ao início."
        )
        return false
      }
    }

    if (
      currentStepId === "participants" &&
      participantCount === 0
    ) {
      toast.error(
        "Selecione pelo menos uma origem de avaliação."
      )
      return false
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
            : "Criar ciclo"
        }
        disabled={!hasActiveTemplates}
        isPending={isPending}
      />
    </ProductWizardFooter>
  )
}
