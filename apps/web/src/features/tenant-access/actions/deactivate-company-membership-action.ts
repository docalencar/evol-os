"use server"

import { randomUUID } from "node:crypto"

import {
  deactivateCompanyMembership,
  type DeactivateCompanyMembershipInput,
  type DeactivateCompanyMembershipResult,
} from "../orchestration/manage-company-membership"
import { createServerTenantAccessApplication } from "../server"
import { loadMembershipManagementTenantContext } from "./membership-management-tenant-context"

export async function deactivateCompanyMembershipAction(
  input: DeactivateCompanyMembershipInput,
): Promise<DeactivateCompanyMembershipResult> {
  return deactivateCompanyMembership({
    loadTenantContext: loadMembershipManagementTenantContext,
    createApplicationService: createServerTenantAccessApplication,
    generateId: randomUUID,
  }, input)
}

export type { DeactivateCompanyMembershipInput, DeactivateCompanyMembershipResult }
