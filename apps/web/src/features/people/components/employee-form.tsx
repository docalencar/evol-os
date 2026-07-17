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

import { createEmployeeAction } from "../actions/create-employee-action"
import { updateEmployeeAction } from "../actions/update-employee-action"
import type { Employee } from "../types/employee"
import {
  EmployeeOrganizationStep,
  EmployeeOrganizationSummary,
} from "./steps/employee-organization-step"
import {
  EmployeePersonalStep,
  EmployeePersonalSummary,
} from "./steps/employee-personal-step"
import {
  EmployeeProfessionalStep,
  EmployeeProfessionalSummary,
  employeeDiscProfiles,
  formatEmployeeDate,
} from "./steps/employee-professional-step"
import { EmployeeReviewStep } from "./steps/employee-review-step"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeFormProps = {
  companyId: string
  employee?: Employee
  teams?: EmployeeSelectOption[]
  positions?: EmployeeSelectOption[]
  managers?: EmployeeSelectOption[]
  onSuccess?: () => void
  onCancel?: () => void
}

const wizardSteps: ProductWizardStepDefinition[] = [
  {
    id: "personal",
    title: "Informações pessoais",
    description:
      "Informe os dados básicos e os canais de contato.",
  },
  {
    id: "organization",
    title: "Estrutura organizacional",
    description:
      "Posicione a pessoa na estrutura da empresa.",
  },
  {
    id: "professional",
    title: "Dados profissionais",
    description:
      "Registre datas importantes e informações de perfil.",
  },
  {
    id: "review",
    title: "Revisão",
    description:
      "Confira o cadastro antes de concluir.",
  },
]

export function EmployeeForm({
  companyId,
  employee,
  teams = [],
  positions = [],
  managers = [],
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] =
    useTransition()

  const isEditing = Boolean(employee)

  const [fullName, setFullName] =
    useState(employee?.full_name ?? "")
  const [email, setEmail] =
    useState(employee?.email ?? "")
  const [phone, setPhone] =
    useState(employee?.phone ?? "")
  const [teamId, setTeamId] =
    useState(employee?.team_id ?? "")
  const [positionId, setPositionId] =
    useState(employee?.position_id ?? "")
  const [managerId, setManagerId] =
    useState(employee?.manager_id ?? "")
  const [discProfile, setDiscProfile] =
    useState(employee?.disc_profile ?? "")
  const [hireDate, setHireDate] =
    useState(employee?.hire_date ?? "")
  const [birthDate, setBirthDate] =
    useState(employee?.birth_date ?? "")

  const availableManagers = managers.filter(
    (manager) => manager.id !== employee?.id
  )

  const selectedTeam = teams.find(
    (team) => team.id === teamId
  )

  const selectedPosition = positions.find(
    (position) => position.id === positionId
  )

  const selectedManager =
    availableManagers.find(
      (manager) => manager.id === managerId
    )

  const selectedDiscProfile =
    employeeDiscProfiles.find(
      (profile) =>
        profile.value === discProfile
    )

  function handleSubmit(
    formData: FormData
  ) {
    const input = {
      fullName: String(
        formData.get("fullName") ?? ""
      ),
      email: String(
        formData.get("email") ?? ""
      ),
      phone: String(
        formData.get("phone") ?? ""
      ),
      birthDate: String(
        formData.get("birthDate") ?? ""
      ),
      hireDate: String(
        formData.get("hireDate") ?? ""
      ),
      status: String(
        formData.get("status") ?? "active"
      ),
      teamId: String(
        formData.get("teamId") ?? ""
      ),
      positionId: String(
        formData.get("positionId") ?? ""
      ),
      managerId: String(
        formData.get("managerId") ?? ""
      ),
      discProfile: String(
        formData.get("discProfile") ?? ""
      ),
    }

    startTransition(async () => {
      const result = employee
        ? await updateEmployeeAction(
            companyId,
            employee.id,
            input
          )
        : await createEmployeeAction(
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
    <form
      ref={formRef}
      action={handleSubmit}
      className="min-h-0"
    >
      <input
        type="hidden"
        name="fullName"
        value={fullName}
      />
      <input
        type="hidden"
        name="email"
        value={email}
      />
      <input
        type="hidden"
        name="phone"
        value={phone}
      />
      <input
        type="hidden"
        name="teamId"
        value={teamId}
      />
      <input
        type="hidden"
        name="positionId"
        value={positionId}
      />
      <input
        type="hidden"
        name="managerId"
        value={managerId}
      />
      <input
        type="hidden"
        name="discProfile"
        value={discProfile}
      />
      <input
        type="hidden"
        name="hireDate"
        value={hireDate}
      />
      <input
        type="hidden"
        name="birthDate"
        value={birthDate}
      />
      <input
        type="hidden"
        name="status"
        value={employee?.status ?? "active"}
      />

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
            id="personal"
            title="Informações pessoais"
            description="Informe os dados básicos e os canais de contato."
            summary={
              <EmployeePersonalSummary
                fullName={fullName}
                email={email}
              />
            }
          >
            <EmployeePersonalStep
              fullName={fullName}
              email={email}
              phone={phone}
              onFullNameChange={setFullName}
              onEmailChange={setEmail}
              onPhoneChange={setPhone}
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="organization"
            title="Estrutura organizacional"
            description="Defina time, cargo e liderança direta."
            summary={
              <EmployeeOrganizationSummary
                teamName={selectedTeam?.name}
                positionName={
                  selectedPosition?.name
                }
                managerName={
                  selectedManager?.name
                }
              />
            }
          >
            <EmployeeOrganizationStep
              teams={teams}
              positions={positions}
              managers={availableManagers}
              teamId={teamId}
              positionId={positionId}
              managerId={managerId}
              onTeamIdChange={setTeamId}
              onPositionIdChange={
                setPositionId
              }
              onManagerIdChange={
                setManagerId
              }
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="professional"
            title="Dados profissionais"
            description="Registre datas importantes e informações de perfil."
            summary={
              <EmployeeProfessionalSummary
                discProfileLabel={
                  selectedDiscProfile?.label
                }
                hireDate={hireDate}
              />
            }
          >
            <EmployeeProfessionalStep
              discProfile={discProfile}
              hireDate={hireDate}
              birthDate={birthDate}
              onDiscProfileChange={
                setDiscProfile
              }
              onHireDateChange={setHireDate}
              onBirthDateChange={
                setBirthDate
              }
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="review"
            title="Revisão"
            description="Confira tudo antes de salvar."
            summary="Cadastro pronto para conclusão"
          >
            <EmployeeReviewStep
              fullName={fullName}
              email={email}
              phone={phone}
              teamName={selectedTeam?.name}
              positionName={
                selectedPosition?.name
              }
              managerName={
                selectedManager?.name
              }
              discProfileLabel={
                selectedDiscProfile?.label
              }
              hireDateLabel={
                formatEmployeeDate(hireDate)
              }
              birthDateLabel={
                formatEmployeeDate(birthDate)
              }
              isEditing={isEditing}
            />
          </ProductWizardStep>
        </div>

        <EmployeeWizardFooter
          isPending={isPending}
          isEditing={isEditing}
          fullName={fullName}
          email={email}
          hireDate={hireDate}
          birthDate={birthDate}
          managerId={managerId}
          employeeId={employee?.id}
          onCancel={onCancel}
        />
      </ProductWizard>
    </form>
  )
}

type EmployeeWizardFooterProps = {
  isPending: boolean
  isEditing: boolean
  fullName: string
  email: string
  hireDate: string
  birthDate: string
  managerId: string
  employeeId?: string
  onCancel?: () => void
}

function EmployeeWizardFooter({
  isPending,
  isEditing,
  fullName,
  email,
  hireDate,
  birthDate,
  managerId,
  employeeId,
  onCancel,
}: EmployeeWizardFooterProps) {
  const { currentStepId } =
    useProductWizard()

  function validateCurrentStep() {
    if (currentStepId === "personal") {
      if (fullName.trim().length < 2) {
        toast.error(
          "Informe o nome completo com pelo menos 2 caracteres."
        )
        return false
      }

      if (
        email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim()
        )
      ) {
        toast.error(
          "Informe um endereço de e-mail válido."
        )
        return false
      }
    }

    if (
      currentStepId === "organization" &&
      employeeId &&
      managerId === employeeId
    ) {
      toast.error(
        "A pessoa não pode ser gestora de si mesma."
      )
      return false
    }

    if (
      currentStepId === "professional" &&
      hireDate &&
      birthDate &&
      hireDate < birthDate
    ) {
      toast.error(
        "A data de admissão não pode ser anterior ao nascimento."
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
            : "Criar colaborador"
        }
        isPending={isPending}
      />
    </ProductWizardFooter>
  )
}
