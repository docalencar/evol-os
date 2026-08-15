import "server-only"

import { z } from "zod"

import type {
  MembershipDeactivationPersistenceResult,
  MembershipRolePersistenceResult,
  OwnershipTransferPersistenceResult,
  TenantAccessApplicationResult,
  TenantAccessApplicationService,
  TenantMembershipRole,
} from "../application"

const roleSchema = z.enum(["owner", "admin", "hr", "manager", "employee"])
const membershipStatusSchema = z.enum(["active", "inactive", "invited"])

const roleChangeSchema = z.object({
  membershipId: z.string().uuid(),
  expectedRole: roleSchema,
  expectedStatus: membershipStatusSchema,
  newRole: roleSchema,
}).strict()

const deactivationSchema = z.object({
  membershipId: z.string().uuid(),
  expectedRole: roleSchema,
  expectedStatus: membershipStatusSchema,
}).strict()

const ownershipTransferSchema = z.object({
  targetMembershipId: z.string().uuid(),
  expectedTargetRole: roleSchema,
  demoteActor: z.boolean(),
}).strict()

export type ChangeCompanyMembershipRoleInput = z.input<typeof roleChangeSchema>
export type DeactivateCompanyMembershipInput = z.input<typeof deactivationSchema>
export type TransferCompanyOwnershipInput = z.input<typeof ownershipTransferSchema>

type RedirectStatus = "session_expired" | "no_membership" | "tenant_selection_required"

export type MembershipManagementTenantContextResult =
  | Readonly<{ status: "resolved"; companyId: string; actorRole: TenantMembershipRole }>
  | Readonly<{ status: RedirectStatus }>

type FailureResult =
  | Readonly<{ status: "invalid_input" | "denied" | "conflict" | "last_owner" | "failed"; message: string; correlationId?: string }>
  | Readonly<{ status: RedirectStatus }>

export type ChangeCompanyMembershipRoleResult =
  | Readonly<{ status: "membership_role_changed"; membershipId: string; role: TenantMembershipRole; correlationId: string }>
  | FailureResult

export type DeactivateCompanyMembershipResult =
  | Readonly<{ status: "membership_deactivated"; membershipId: string; correlationId: string }>
  | FailureResult

export type TransferCompanyOwnershipResult =
  | Readonly<{ status: "ownership_transferred"; targetMembershipId: string; actorDemoted: boolean; correlationId: string }>
  | FailureResult

export type MembershipManagementDependencies = Readonly<{
  loadTenantContext: () => Promise<MembershipManagementTenantContextResult>
  createApplicationService: () => Promise<Pick<
    TenantAccessApplicationService,
    "changeMembershipRole" | "deactivateMembership" | "transferOwnership"
  >>
  generateId: () => string
}>

const SAFE_FAILURE_MESSAGE = "Não foi possível concluir a operação."
const STALE_MESSAGE = "Este acesso foi alterado por outra operação. Atualize a página e tente novamente."
const LAST_OWNER_MESSAGE = "Não é possível desativar ou rebaixar o último proprietário ativo da empresa."

async function resolveContext(
  dependencies: MembershipManagementDependencies,
): Promise<MembershipManagementTenantContextResult | Readonly<{ status: "failed"; message: string }>> {
  try {
    return await dependencies.loadTenantContext()
  } catch {
    return { status: "failed", message: SAFE_FAILURE_MESSAGE }
  }
}

function mapFailure<T>(
  result: TenantAccessApplicationResult<T>,
  correlationId: string,
): FailureResult {
  if (result.status === "denied") {
    return { status: "denied", message: "Você não tem permissão para esta ação." }
  }
  if (result.status === "unexpected_persistence_failure") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  if (result.status === "conflict" && result.code === "LAST_ACTIVE_OWNER_REQUIRED") {
    return { status: "last_owner", message: LAST_OWNER_MESSAGE }
  }
  if (result.status === "conflict") {
    return { status: "conflict", message: STALE_MESSAGE }
  }
  if (result.status === "known_failure" &&
    (result.code === "TENANT_MEMBERSHIP_NOT_FOUND" ||
      result.code === "TENANT_OPERATION_INVALID" ||
      result.code === "TENANT_ROLE_INVALID")) {
    return { status: "invalid_input", message: "Os dados do acesso são inválidos." }
  }
  return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
}

export async function changeCompanyMembershipRole(
  dependencies: MembershipManagementDependencies,
  input: unknown,
): Promise<ChangeCompanyMembershipRoleResult> {
  const parsed = roleChangeSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "Os dados do acesso são inválidos." }

  const context = await resolveContext(dependencies)
  if (context.status !== "resolved") return context
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  try {
    const service = await dependencies.createApplicationService()
    const persistence = await service.changeMembershipRole({
      companyId: context.companyId,
      ...parsed.data,
      idempotencyKey,
      correlationId,
    })
    if (persistence.status === "succeeded" || persistence.status === "idempotent_retry") {
      return {
        status: "membership_role_changed",
        membershipId: persistence.result.membershipId,
        role: persistence.result.role,
        correlationId,
      }
    }
    return mapFailure<MembershipRolePersistenceResult>(persistence, correlationId)
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
}

export async function deactivateCompanyMembership(
  dependencies: MembershipManagementDependencies,
  input: unknown,
): Promise<DeactivateCompanyMembershipResult> {
  const parsed = deactivationSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "Os dados do acesso são inválidos." }

  const context = await resolveContext(dependencies)
  if (context.status !== "resolved") return context
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  try {
    const service = await dependencies.createApplicationService()
    const persistence = await service.deactivateMembership({
      companyId: context.companyId,
      ...parsed.data,
      idempotencyKey,
      correlationId,
    })
    if (persistence.status === "succeeded" || persistence.status === "idempotent_retry") {
      return {
        status: "membership_deactivated",
        membershipId: persistence.result.membershipId,
        correlationId,
      }
    }
    return mapFailure<MembershipDeactivationPersistenceResult>(persistence, correlationId)
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
}

export async function transferCompanyOwnership(
  dependencies: MembershipManagementDependencies,
  input: unknown,
): Promise<TransferCompanyOwnershipResult> {
  const parsed = ownershipTransferSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "Os dados da transferência são inválidos." }

  const context = await resolveContext(dependencies)
  if (context.status !== "resolved") return context
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  try {
    const service = await dependencies.createApplicationService()
    const persistence = await service.transferOwnership({
      companyId: context.companyId,
      targetMembershipId: parsed.data.targetMembershipId,
      expectedTargetRole: parsed.data.expectedTargetRole,
      expectedActorRole: context.actorRole,
      demoteActor: parsed.data.demoteActor,
      idempotencyKey,
      correlationId,
    })
    if (persistence.status === "succeeded" || persistence.status === "idempotent_retry") {
      return {
        status: "ownership_transferred",
        targetMembershipId: persistence.result.targetMembershipId,
        actorDemoted: persistence.result.actorDemoted,
        correlationId,
      }
    }
    return mapFailure<OwnershipTransferPersistenceResult>(persistence, correlationId)
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
}
