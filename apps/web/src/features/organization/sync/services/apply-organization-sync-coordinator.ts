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
  OrganizationSyncApplyResult,
} from "../engine/apply"
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

async function applyItemByEntity(
  companyId: string,
  item: OrganizationSyncItem
) {
  switch (item.entity) {
    case "department": {
      const result = await applyDepartmentSyncItem({
        companyId,
        item,
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return
    }

    case "team": {
      const result = await applyTeamSyncItem({
        companyId,
        item,
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return
    }

    case "position": {
      const result = await applyPositionSyncItem({
        companyId,
        item,
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return
    }

    case "employee": {
      const result = await applyEmployeeSyncItem({
        companyId,
        item,
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return
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
}: ApplyOrganizationSyncCoordinatorInput): Promise<OrganizationSyncApplyResult> {
  return applyOrganizationSyncPlan(
    plan,
    createApplyHandlers(companyId)
  )
}
