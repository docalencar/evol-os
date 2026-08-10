import "server-only"

import { z } from "zod"

import type {
  InvitationPersistenceResult,
  TenantAccessApplicationResult,
  TenantAccessApplicationService,
  TenantAccessStableErrorCode,
} from "../application"

const revokeInvitationInputSchema = z.object({
  invitationId: z.string().uuid(),
  expectedGeneration: z.number().int().positive(),
}).strict()

export type RevokeCompanyMemberInvitationInput = z.input<typeof revokeInvitationInputSchema>

export type RevokeCompanyMemberInvitationResult =
  | Readonly<{ status: "invitation_revoked"; invitationId: string; correlationId: string }>
  | Readonly<{ status: "conflict"; reason: "stale_generation" | "already_accepted"; message: string }>
  | Readonly<{ status: "denied"; message: string }>
  | Readonly<{ status: "invalid_input"; message: string }>
  | Readonly<{ status: "session_expired" | "no_membership" | "tenant_selection_required" }>
  | Readonly<{ status: "failed"; correlationId?: string; message: string }>

export type RevokeInvitationTenantContextResult =
  | Readonly<{ status: "resolved"; companyId: string }>
  | Readonly<{ status: "session_expired" | "no_membership" | "tenant_selection_required" }>

type RevokeCompanyMemberInvitationDependencies = Readonly<{
  loadTenantContext: () => Promise<RevokeInvitationTenantContextResult>
  createApplicationService: () => Promise<Pick<TenantAccessApplicationService, "revokeInvitation">>
  generateId: () => string
}>

const SAFE_FAILURE_MESSAGE = "Não foi possível concluir a operação."

export async function revokeCompanyMemberInvitation(
  dependencies: RevokeCompanyMemberInvitationDependencies,
  input: unknown,
): Promise<RevokeCompanyMemberInvitationResult> {
  const parsed = revokeInvitationInputSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "Os dados do convite são inválidos." }

  let context: RevokeInvitationTenantContextResult
  try {
    context = await dependencies.loadTenantContext()
  } catch {
    return { status: "failed", message: SAFE_FAILURE_MESSAGE }
  }
  if (context.status !== "resolved") return context

  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  let persistence: TenantAccessApplicationResult<InvitationPersistenceResult>
  try {
    const service = await dependencies.createApplicationService()
    persistence = await service.revokeInvitation({
      companyId: context.companyId,
      invitationId: parsed.data.invitationId,
      expectedGeneration: parsed.data.expectedGeneration,
      idempotencyKey,
      correlationId,
    })
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }

  if (persistence.status === "succeeded" || persistence.status === "idempotent_retry") {
    return {
      status: "invitation_revoked",
      invitationId: persistence.result.invitationId,
      correlationId,
    }
  }
  return mapPersistenceFailure(persistence, correlationId)
}

function mapPersistenceFailure(
  result: TenantAccessApplicationResult<InvitationPersistenceResult>,
  correlationId: string,
): RevokeCompanyMemberInvitationResult {
  if ("result" in result) return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  if (result.status === "denied") {
    return { status: "denied", message: "Você não tem permissão para esta ação." }
  }
  if (result.status === "unexpected_persistence_failure") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  return mapStableFailure(result.code, result.status, correlationId)
}

function mapStableFailure(
  code: TenantAccessStableErrorCode,
  status: "conflict" | "known_failure",
  correlationId: string,
): RevokeCompanyMemberInvitationResult {
  if (code === "TENANT_CONFLICT") {
    return { status: "conflict", reason: "stale_generation", message: "O convite mudou. Recarregue e tente novamente." }
  }
  if (code === "TENANT_INVITE_ALREADY_ACCEPTED") {
    return { status: "conflict", reason: "already_accepted", message: "Esta pessoa já aceitou o convite." }
  }
  if (code === "TENANT_INVITE_NOT_FOUND") {
    return { status: "invalid_input", message: "Convite não encontrado." }
  }
  if (code === "TENANT_IDEMPOTENCY_CONFLICT") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  if (status === "conflict") {
    return { status: "conflict", reason: "stale_generation", message: "O convite mudou. Recarregue e tente novamente." }
  }
  return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
}

export type { RevokeCompanyMemberInvitationDependencies }
