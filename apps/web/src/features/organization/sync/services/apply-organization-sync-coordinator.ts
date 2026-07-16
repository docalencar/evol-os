import "server-only"

import {
  applyDepartmentSyncItem,
} from "@/features/organization/departments"
import {
  applyPositionSyncItem,
} from "@/features/organization/positions"
import {
  applyTeamSyncItem,
} from "@/features/organization/teams"
import {
  applyEmployeeSyncItem,
} from "@/features/people"

import {
  applyOrganizationSyncPlan,
} from "../engine/apply"
import type {
  OrganizationSyncApplyHandlers,
} from "../engine/apply"
import {
  createOrganizationExecutionReport,
} from "../engine/report"
import type {
  OrganizationExecutionReport,
} from "../types/organization-execution-report"
import type {
  OrganizationMutationReceipt,
} from "../types/organization-mutation-receipt"
import type {
  OrganizationSyncItem,
} from "../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"

export type ApplyOrganizationSyncCoordinatorInput = {
  companyId: string
  plan: OrganizationSyncPlan
}

function createMutationReceipt(
  item: OrganizationSyncItem,
  entityId: string
): OrganizationMutationReceipt {
  return {
    itemId: item.id,
    entity: item.entity,
    operation: item.operation,
    entityId,
  }
}

async function applyItemByEntity(
  companyId: string,
  item: OrganizationSyncItem
): Promise<OrganizationMutationReceipt> {
  switch (item.entity) {
    case "department": {
      const result =
        await applyDepartmentSyncItem({
          companyId,
          item,
        })

      if (!result.success) {
        throw new Error(result.message)
      }

      if (!result.departmentId) {
        throw new Error(
          "O departamento foi aplicado sem retornar um identificador."
        )
      }

      return createMutationReceipt(
        item,
        result.departmentId
      )
    }

    case "team": {
      const result =
        await applyTeamSyncItem({
          companyId,
          item,
        })

      if (!result.success) {
        throw new Error(result.message)
      }

      if (!result.teamId) {
        throw new Error(
          "O time foi aplicado sem retornar um identificador."
        )
      }

      return createMutationReceipt(
        item,
        result.teamId
      )
    }

    case "position": {
      const result =
        await applyPositionSyncItem({
          companyId,
          item,
        })

      if (!result.success) {
        throw new Error(result.message)
      }

      if (!result.positionId) {
        throw new Error(
          "O cargo foi aplicado sem retornar um identificador."
        )
      }

      return createMutationReceipt(
        item,
        result.positionId
      )
    }

    case "employee": {
      const result =
        await applyEmployeeSyncItem({
          companyId,
          item,
        })

      if (!result.success) {
        throw new Error(result.message)
      }

      if (!result.employeeId) {
        throw new Error(
          "O colaborador foi aplicado sem retornar um identificador."
        )
      }

      return createMutationReceipt(
        item,
        result.employeeId
      )
    }
  }
}

function createApplyHandlers(
  companyId: string
): OrganizationSyncApplyHandlers {
  return {
    create: (item) =>
      applyItemByEntity(companyId, item),

    update: (item) =>
      applyItemByEntity(companyId, item),

    move: (item) =>
      applyItemByEntity(companyId, item),

    archive: (item) =>
      applyItemByEntity(companyId, item),

    restore: (item) =>
      applyItemByEntity(companyId, item),
  }
}

export async function applyOrganizationSyncCoordinator({
  companyId,
  plan,
}: ApplyOrganizationSyncCoordinatorInput): Promise<OrganizationExecutionReport> {
  const startedAt = new Date()

  const result =
    await applyOrganizationSyncPlan(
      plan,
      createApplyHandlers(companyId)
    )

  const finishedAt = new Date()

  return createOrganizationExecutionReport({
    startedAt,
    finishedAt,
    result,
  })
}
