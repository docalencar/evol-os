"use server"

import { randomUUID } from "node:crypto"

import {
  transferCompanyOwnership,
  type TransferCompanyOwnershipInput,
  type TransferCompanyOwnershipResult,
} from "../orchestration/manage-company-membership"
import { createServerTenantAccessApplication } from "../server"
import { loadMembershipManagementTenantContext } from "./membership-management-tenant-context"

export async function transferCompanyOwnershipAction(
  input: TransferCompanyOwnershipInput,
): Promise<TransferCompanyOwnershipResult> {
  return transferCompanyOwnership({
    loadTenantContext: loadMembershipManagementTenantContext,
    createApplicationService: createServerTenantAccessApplication,
    generateId: randomUUID,
  }, input)
}

export type { TransferCompanyOwnershipInput, TransferCompanyOwnershipResult }
