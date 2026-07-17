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
  return {
    async findUserIdByEmployeeId(
      companyId,
      employeeId
    ) {
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
    },

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

      const {
        data: manager,
        error: managerError,
      } =
        await repository.findManagerUser(
          companyId,
          employee.manager_id
        )

      if (managerError) {
        throwDirectoryError(
          "resolver o usuário do gestor",
          managerError.message
        )
      }

      return manager?.user_id ?? null
    },
  }
}
