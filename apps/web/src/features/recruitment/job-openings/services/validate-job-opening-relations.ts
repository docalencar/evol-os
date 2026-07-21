import {
  getDepartmentById,
} from "@/features/organization/departments"
import {
  getPositionById,
} from "@/features/organization/positions"
import {
  getEmployeeById,
  type Employee,
} from "@/features/people"

type ValidateJobOpeningRelationsInput = {
  companyId: string
  departmentId?: string
  positionId?: string
  requestingManagerId?: string
  recruiterId?: string | null
  replacedEmployeeId?: string | null
  approverId?: string | null
}

async function requireEmployee(
  companyId: string,
  employeeId: string,
  label: string
): Promise<Employee> {
  try {
    const employee =
      await getEmployeeById(
        companyId,
        employeeId
      )

    if (!employee) {
      throw new Error()
    }

    return employee as Employee
  } catch {
    throw new Error(
      `${label} não encontrado na empresa.`
    )
  }
}

export async function validateJobOpeningRelations(
  input: ValidateJobOpeningRelationsInput
): Promise<void> {
  const departmentPromise = input.departmentId
    ? getDepartmentById(
        input.companyId,
        input.departmentId
      ).catch(() => null)
    : Promise.resolve(null)

  const positionPromise = input.positionId
    ? getPositionById(
        input.companyId,
        input.positionId
      ).catch(() => null)
    : Promise.resolve(null)

  const employeeRequests: Array<
    Promise<Employee>
  > = []

  if (input.requestingManagerId) {
    employeeRequests.push(
      requireEmployee(
        input.companyId,
        input.requestingManagerId,
        "Gestor solicitante"
      )
    )
  }

  if (input.recruiterId) {
    employeeRequests.push(
      requireEmployee(
        input.companyId,
        input.recruiterId,
        "Recrutador responsável"
      )
    )
  }

  if (input.replacedEmployeeId) {
    employeeRequests.push(
      requireEmployee(
        input.companyId,
        input.replacedEmployeeId,
        "Pessoa substituída"
      )
    )
  }

  if (input.approverId) {
    employeeRequests.push(
      requireEmployee(
        input.companyId,
        input.approverId,
        "Aprovador"
      )
    )
  }

  const [department, position] =
    await Promise.all([
      departmentPromise,
      positionPromise,
      ...employeeRequests,
    ])

  if (input.departmentId && !department) {
    throw new Error(
      "Departamento não encontrado na empresa."
    )
  }

  if (input.positionId && !position) {
    throw new Error(
      "Cargo não encontrado na empresa."
    )
  }

  if (
    position &&
    position.status !== "active"
  ) {
    throw new Error(
      "Somente cargos ativos podem ser vinculados à vaga."
    )
  }

  if (
    department &&
    position?.department_id &&
    position.department_id !== department.id
  ) {
    throw new Error(
      "O cargo selecionado não pertence ao departamento informado."
    )
  }
}
