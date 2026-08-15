"use server"

import { randomUUID } from "node:crypto"

import {
  changeCompanyMembershipRole,
  type ChangeCompanyMembershipRoleInput,
  type ChangeCompanyMembershipRoleResult,
} from "../orchestration/manage-company-membership"
import { createServerTenantAccessApplication } from "../server"
import { loadMembershipManagementTenantContext } from "./membership-management-tenant-context"

export async function changeCompanyMembershipRoleAction(
  input: ChangeCompanyMembershipRoleInput,
): Promise<ChangeCompanyMembershipRoleResult> {
  return changeCompanyMembershipRole({
    loadTenantContext: loadMembershipManagementTenantContext,
    createApplicationService: createServerTenantAccessApplication,
    generateId: randomUUID,
  }, input)
}

export type { ChangeCompanyMembershipRoleInput, ChangeCompanyMembershipRoleResult }
