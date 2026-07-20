import type {
  Employee,
  EmployeeStatus,
} from "@/features/people"

import type {
  Position,
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../types/position"

import type {
  PositionWorkspaceEmployeeViewModel,
  PositionWorkspaceViewModel,
} from "../view-models/position-workspace-view-model"

type PositionWorkspaceDepartmentInput = {
  id: string
  name: string
}

type PresentPositionWorkspaceInput = {
  position: Position
  department: PositionWorkspaceDepartmentInput | null
  employees: Employee[]
  competencyCount: number
  requirementCount: number
  visibleEmployeesLimit?: number
}

const EMPLOYEE_STATUS_LABELS: Record<
  EmployeeStatus,
  string
> = {
  active: "Ativo",
  inactive: "Inativo",
  on_leave: "Afastado",
  terminated: "Desligado",
}

const HIERARCHICAL_LEVEL_LABELS: Record<
  PositionHierarchicalLevel,
  string
> = {
  intern: "Estagiário",
  assistant: "Assistente",
  analyst: "Analista",
  specialist: "Especialista",
  coordinator: "Coordenador",
  supervisor: "Supervisor",
  manager: "Gerente",
  director: "Diretor",
  executive: "Executivo",
}

const POSITION_STATUS_LABELS: Record<
  PositionStatus,
  string
> = {
  draft: "Rascunho",
  active: "Ativo",
  inactive: "Inativo",
  obsolete: "Obsoleto",
}

const WORK_MODEL_LABELS: Record<
  PositionWorkModel,
  string
> = {
  on_site: "Presencial",
  hybrid: "Híbrido",
  remote: "Remoto",
}

const EMPLOYMENT_TYPE_LABELS: Record<
  PositionEmploymentType,
  string
> = {
  clt: "CLT",
  pj: "Pessoa jurídica",
  intern: "Estágio",
  apprentice: "Aprendiz",
  temporary: "Temporário",
  outsourced: "Terceirizado",
  contractor: "Prestador de serviço",
  other: "Outro",
}

const TRAVEL_REQUIREMENT_LABELS: Record<
  PositionTravelRequirement,
  string
> = {
  none: "Não exige viagens",
  occasional: "Viagens ocasionais",
  frequent: "Viagens frequentes",
}

function presentEmployee(
  employee: Employee
): PositionWorkspaceEmployeeViewModel {
  return {
    id: employee.id,
    name: employee.full_name,
    email:
      employee.email ??
      "E-mail não informado",
    statusLabel:
      EMPLOYEE_STATUS_LABELS[
        employee.status
      ],
    profileHref:
      `/app/people/${employee.id}`,
  }
}

function formatCountDescription(
  count: number,
  singular: string,
  plural: string
) {
  return count === 1
    ? singular
    : plural
}

export function presentPositionWorkspace({
  position,
  department,
  employees,
  competencyCount,
  requirementCount,
  visibleEmployeesLimit = 6,
}: PresentPositionWorkspaceInput): PositionWorkspaceViewModel {
  const positionEmployees = employees
    .filter(
      (employee) =>
        employee.position_id ===
          position.id &&
        employee.status !== "terminated"
    )
    .sort((firstEmployee, secondEmployee) =>
      firstEmployee.full_name.localeCompare(
        secondEmployee.full_name,
        "pt-BR"
      )
    )

  const activeEmployees =
    positionEmployees.filter(
      (employee) =>
        employee.status === "active"
    )

  const onLeaveEmployees =
    positionEmployees.filter(
      (employee) =>
        employee.status === "on_leave"
    )

  const presentedEmployees =
    positionEmployees.map(
      presentEmployee
    )

  const visibleEmployees =
    presentedEmployees.slice(
      0,
      visibleEmployeesLimit
    )

  return {
    id: position.id,
    companyId: position.company_id,
    name: position.name,
    description:
      position.description ??
      "Cargo sem descrição cadastrada.",

    context: {
      departmentId:
        position.department_id,
      departmentLabel:
        department?.name ??
        "Sem departamento vinculado",
      hierarchicalLevelLabel:
        HIERARCHICAL_LEVEL_LABELS[
          position.hierarchical_level
        ],
      statusLabel:
        POSITION_STATUS_LABELS[
          position.status
        ],
    },

    arrangement: {
      weeklyWorkloadLabel:
        `${position.weekly_workload_hours} horas semanais`,
      workModelLabel:
        WORK_MODEL_LABELS[
          position.work_model
        ],
      employmentTypeLabel:
        EMPLOYMENT_TYPE_LABELS[
          position.employment_type
        ],
      travelRequirementLabel:
        TRAVEL_REQUIREMENT_LABELS[
          position.travel_requirement
        ],
    },

    metrics: [
      {
        id: "employees",
        label: "Colaboradores",
        value: String(
          positionEmployees.length
        ),
        description:
          formatCountDescription(
            positionEmployees.length,
            "Pessoa vinculada ao cargo",
            "Pessoas vinculadas ao cargo"
          ),
      },
      {
        id: "active-employees",
        label: "Ativos",
        value: String(
          activeEmployees.length
        ),
        description:
          formatCountDescription(
            activeEmployees.length,
            "Colaborador ativo",
            "Colaboradores ativos"
          ),
      },
      {
        id: "on-leave-employees",
        label: "Afastados",
        value: String(
          onLeaveEmployees.length
        ),
        description:
          formatCountDescription(
            onLeaveEmployees.length,
            "Colaborador afastado",
            "Colaboradores afastados"
          ),
      },
      {
        id: "competencies",
        label: "Competências",
        value: String(
          competencyCount
        ),
        description:
          formatCountDescription(
            competencyCount,
            "Competência vinculada",
            "Competências vinculadas"
          ),
      },
      {
        id: "requirements",
        label: "Requisitos",
        value: String(
          requirementCount
        ),
        description:
          formatCountDescription(
            requirementCount,
            "Requisito cadastrado",
            "Requisitos cadastrados"
          ),
      },
    ],

    employees:
      presentedEmployees,

    visibleEmployees,

    remainingEmployees:
      Math.max(
        presentedEmployees.length -
          visibleEmployees.length,
        0
      ),

    hasEmployees:
      presentedEmployees.length > 0,
  }
}
