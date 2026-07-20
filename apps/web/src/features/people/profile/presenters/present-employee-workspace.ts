import {
  EMPLOYEE_STATUS_LABELS,
} from "../../constants/employee-status"
import type {
  Employee,
} from "../../types/employee"
import type {
  EmployeeWorkspaceViewModel,
} from "../view-models/employee-workspace-view-model"

type EmployeeWorkspaceOptionInput = {
  id: string
  name: string
}

type PresentEmployeeWorkspaceInput = {
  employee: Employee
  positionName: string | null
  teamName: string | null
  managerName: string | null
  teams: EmployeeWorkspaceOptionInput[]
  positions: EmployeeWorkspaceOptionInput[]
  managers: EmployeeWorkspaceOptionInput[]
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDate(
  date?: string | null
) {
  if (!date) {
    return "Não informada"
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
    }
  ).format(new Date(date))
}

function getCompanyTenure(
  date?: string | null
) {
  if (!date) {
    return "Não informado"
  }

  const hireDate = new Date(date)
  const today = new Date()

  let years =
    today.getFullYear() -
    hireDate.getFullYear()

  const monthDifference =
    today.getMonth() -
    hireDate.getMonth()

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        hireDate.getDate()
    )
  ) {
    years -= 1
  }

  if (years <= 0) {
    return "Menos de 1 ano"
  }

  return `${years} ${
    years === 1
      ? "ano"
      : "anos"
  }`
}

function formatPhone(
  phone?: string | null
) {
  return phone?.trim() ||
    "Não informado"
}

export function presentEmployeeWorkspace({
  employee,
  positionName,
  teamName,
  managerName,
  teams,
  positions,
  managers,
}: PresentEmployeeWorkspaceInput): EmployeeWorkspaceViewModel {
  const positionLabel =
    positionName ??
    "Sem cargo definido"

  const teamLabel =
    teamName ??
    "Sem time definido"

  const managerLabel =
    managerName ??
    "Sem gestor definido"

  const statusLabel =
    EMPLOYEE_STATUS_LABELS[
      employee.status
    ]

  const hireDateLabel =
    formatDate(
      employee.hire_date
    )

  const emailLabel =
    employee.email?.trim() ||
    "Não informado"

  const phoneLabel =
    formatPhone(
      employee.phone
    )

  const discProfileLabel =
    employee.disc_profile ??
    "Não informado"

  return {
    id: employee.id,
    companyId:
      employee.company_id,

    employeeName:
      employee.full_name,
    status:
      employee.status,

    header: {
      name:
        employee.full_name,
      initials:
        getInitials(
          employee.full_name
        ),
      subtitle:
        `${positionLabel} • ${teamLabel}`,
      statusLabel,
      avatarUrl:
        employee.avatar_url,
    },

    organization: {
      positionId:
        employee.position_id,
      positionLabel,

      teamId:
        employee.team_id,
      teamLabel,

      managerId:
        employee.manager_id,
      managerLabel,

      status:
        employee.status,
      statusLabel,

      hireDateLabel,
    },

    contact: {
      emailLabel,
      phoneLabel,
      discProfileLabel,
    },

    metrics: [
      {
        id: "company-tenure",
        label: "Tempo de empresa",
        value:
          getCompanyTenure(
            employee.hire_date
          ),
        description:
          "Tempo desde a admissão",
      },
      {
        id: "position",
        label: "Cargo",
        value:
          positionLabel,
        description:
          "Função atual",
      },
      {
        id: "team",
        label: "Time",
        value:
          teamLabel,
        description:
          "Equipe atual",
      },
      {
        id: "hire-date",
        label: "Admissão",
        value:
          hireDateLabel,
        description:
          "Data de entrada",
      },
    ],

    options: {
      teams:
        [...teams].sort(
          (
            firstOption,
            secondOption
          ) =>
            firstOption.name.localeCompare(
              secondOption.name,
              "pt-BR"
            )
        ),

      positions:
        [...positions].sort(
          (
            firstOption,
            secondOption
          ) =>
            firstOption.name.localeCompare(
              secondOption.name,
              "pt-BR"
            )
        ),

      managers:
        [...managers]
          .filter(
            (manager) =>
              manager.id !==
              employee.id
          )
          .sort(
            (
              firstOption,
              secondOption
            ) =>
              firstOption.name.localeCompare(
                secondOption.name,
                "pt-BR"
              )
          ),
    },

    hasPosition:
      Boolean(
        employee.position_id
      ),

    hasTeam:
      Boolean(
        employee.team_id
      ),

    hasManager:
      Boolean(
        employee.manager_id
      ),

    hasHireDate:
      Boolean(
        employee.hire_date
      ),

    hasEmail:
      Boolean(
        employee.email?.trim()
      ),

    hasPhone:
      Boolean(
        employee.phone?.trim()
      ),

    hasDiscProfile:
      Boolean(
        employee.disc_profile
      ),
  }
}
