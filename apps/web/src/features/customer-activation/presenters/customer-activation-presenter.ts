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

  const employeeCount = employees?.length ?? 0
  const departmentCount = departments?.length ?? 0
  const positionCount = positions.length

  const hasEmployees = employeeCount > 0
  const hasDepartments = departmentCount > 0
  const hasPositions = positionCount > 0

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
      description: hasEmployees
        ? `${employeeCount} colaborador${
            employeeCount === 1 ? "" : "es"
          } cadastrado${
            employeeCount === 1 ? "" : "s"
          }.`
        : "Inclua as pessoas que farão parte da estrutura da empresa.",
      status: hasEmployees ? "completed" : "pending",
    },
    {
      id: "departments",
      title: "Revisar departamentos",
      description: hasDepartments
        ? `${departmentCount} departamento${
            departmentCount === 1 ? "" : "s"
          } cadastrado${
            departmentCount === 1 ? "" : "s"
          }.`
        : "Organize as principais áreas da empresa.",
      status: hasDepartments ? "completed" : "pending",
    },
    {
      id: "positions",
      title: "Revisar cargos",
      description: hasPositions
        ? `${positionCount} cargo${
            positionCount === 1 ? "" : "s"
          } cadastrado${
            positionCount === 1 ? "" : "s"
          }.`
        : "Defina os cargos utilizados na estrutura organizacional.",
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
  } else {
    nextAction = {
      label: "Explorar a organização",
      href: "/app/organization",
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
    metrics: {
      employees: employeeCount,
      departments: departmentCount,
      positions: positionCount,
    },
  }
}
