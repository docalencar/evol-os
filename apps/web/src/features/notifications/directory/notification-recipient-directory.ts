import "server-only"

import type {
  createNotificationRecipientDirectoryRepository,
} from "./notification-recipient-directory-repository"

type NotificationRecipientDirectoryRepository =
  Awaited<
    ReturnType<
      typeof createNotificationRecipientDirectoryRepository
    >
  >

export type NotificationRecipientDirectory = {
  findUserIdByEmployeeId(
    companyId: string,
    employeeId: string
  ): Promise<string | null>

  findManagerUserId(
    companyId: string,
    employeeId: string
  ): Promise<string | null>

  findTeamLeaderUserId(
    companyId: string,
    teamId: string
  ): Promise<string | null>

  findDepartmentLeaderUserId(
    companyId: string,
    departmentId: string
  ): Promise<string | null>
}

function throwDirectoryError(
  operation: string,
  message: string
): never {
  throw new Error(
    `Não foi possível ${operation}: ${message}`
  )
}

export function createNotificationRecipientDirectoryService(
  repository: NotificationRecipientDirectoryRepository
): NotificationRecipientDirectory {
  async function findUserIdByEmployeeId(
    companyId: string,
    employeeId: string
  ): Promise<string | null> {
    const {
      data,
      error,
    } =
      await repository.findEmployeeUser(
        companyId,
        employeeId
      )

    if (error) {
      throwDirectoryError(
        "resolver o usuário do colaborador",
        error.message
      )
    }

    return data?.user_id ?? null
  }

  return {
    findUserIdByEmployeeId,

    async findManagerUserId(
      companyId,
      employeeId
    ) {
      const {
        data: employee,
        error: employeeError,
      } =
        await repository.findEmployeeManager(
          companyId,
          employeeId
        )

      if (employeeError) {
        throwDirectoryError(
          "resolver o gestor do colaborador",
          employeeError.message
        )
      }

      if (!employee?.manager_id) {
        return null
      }

      return findUserIdByEmployeeId(
        companyId,
        employee.manager_id
      )
    },

    async findTeamLeaderUserId(
      companyId,
      teamId
    ) {
      const {
        data: team,
        error,
      } =
        await repository.findTeamLeader(
          companyId,
          teamId
        )

      if (error) {
        throwDirectoryError(
          "resolver o líder do time",
          error.message
        )
      }

      if (!team?.manager_id) {
        return null
      }

      return findUserIdByEmployeeId(
        companyId,
        team.manager_id
      )
    },

    async findDepartmentLeaderUserId(
      companyId,
      departmentId
    ) {
      const {
        data: department,
        error,
      } =
        await repository.findDepartmentLeader(
          companyId,
          departmentId
        )

      if (error) {
        throwDirectoryError(
          "resolver o gestor do departamento",
          error.message
        )
      }

      if (!department?.manager_id) {
        return null
      }

      return findUserIdByEmployeeId(
        companyId,
        department.manager_id
      )
    },
  }
}
