import { getDepartments } from "@/features/organization/departments"
import { getPositions } from "@/features/organization/positions"
import { getEmployees } from "@/features/people"

import type {
  CustomerActivationNextActionViewModel,
  CustomerActivationStepViewModel,
  CustomerActivationViewModel,
} from "../view-models/customer-activation-view-model"

type PresentCustomerActivationInput = {
  companyId: string
  companyName: string
}

export async function presentCustomerActivation({
  companyId,
  companyName,
}: PresentCustomerActivationInput): Promise<CustomerActivationViewModel> {
  const [
    employees,
    departments,
    positions,
  ] = await Promise.all([
    getEmployees(companyId),
    getDepartments(companyId),
    getPositions(companyId),
  ])

  const hasEmployees = (employees?.length ?? 0) > 0
  const hasDepartments = (departments?.length ?? 0) > 0
  const hasPositions = positions.length > 0

  const steps: CustomerActivationStepViewModel[] = [
    {
      id: "company",
      title: "Empresa criada",
      description: `${companyName} está conectada ao Evol OS.`,
      status: "completed",
    },
    {
      id: "employees",
      title: "Adicionar colaboradores",
      description:
        "Inclua as pessoas que farão parte da estrutura da empresa.",
      status: hasEmployees ? "completed" : "pending",
    },
    {
      id: "departments",
      title: "Revisar departamentos",
      description:
        "Organize as principais áreas da empresa.",
      status: hasDepartments ? "completed" : "pending",
    },
    {
      id: "positions",
      title: "Revisar cargos",
      description:
        "Defina os cargos utilizados na estrutura organizacional.",
      status: hasPositions ? "completed" : "pending",
    },
  ]

  const completedSteps = steps.filter(
    (step) => step.status === "completed"
  ).length

  const totalSteps = steps.length

  const progress = Math.round(
    (completedSteps / totalSteps) * 100
  )

  let nextAction: CustomerActivationNextActionViewModel = null

  if (!hasEmployees) {
    nextAction = {
      label: "Importar colaboradores",
      href: "/app/people/import",
    }
  } else if (!hasDepartments) {
    nextAction = {
      label: "Revisar departamentos",
      href: "/app/company",
    }
  } else if (!hasPositions) {
    nextAction = {
      label: "Revisar cargos",
      href: "/app/company/positions",
    }
  }

  return {
    companyName,
    progress,
    completedSteps,
    totalSteps,
    isComplete: completedSteps === totalSteps,
    steps,
    nextAction,
  }
}
