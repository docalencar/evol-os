import "server-only"

import { z } from "zod"

import type {
  ResentInvitationPersistenceResult,
  TenantAccessApplicationResult,
  TenantAccessApplicationService,
  TenantAccessStableErrorCode,
} from "../application"
import type { TenantInvitationDelivery, TenantInvitationDeliveryResult } from "../delivery"
import type { InvitationToken } from "../token"

const resendInvitationInputSchema = z.object({
  invitationId: z.string().uuid(),
  expectedGeneration: z.number().int().positive(),
}).strict()

export type ResendCompanyMemberInvitationInput = z.input<typeof resendInvitationInputSchema>

export type ResendCompanyMemberInvitationResult =
  | Readonly<{ status: "invitation_sent"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "invitation_updated_delivery_failed"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "invitation_updated_delivery_unknown"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "configuration_error"; invitationId?: string; generation?: number; correlationId: string }>
  | Readonly<{ status: "conflict"; reason: "stale_generation" | "revoked" | "already_accepted"; message: string }>
  | Readonly<{ status: "denied"; message: string }>
  | Readonly<{ status: "invalid_input"; message: string }>
  | Readonly<{ status: "session_expired" | "no_membership" | "tenant_selection_required" }>
  | Readonly<{ status: "failed"; correlationId?: string; message: string }>

type ResolvedResendInvitationTenantContext = Readonly<{
  status: "resolved"
  companyId: string
  companyName: string
  inviterName?: string
}>

export type ResendInvitationTenantContextResult =
  | ResolvedResendInvitationTenantContext
  | Readonly<{ status: "session_expired" | "no_membership" | "tenant_selection_required" }>

type ResendCompanyMemberInvitationDependencies = Readonly<{
  loadTenantContext: () => Promise<ResendInvitationTenantContextResult>
  createApplicationService: () => Promise<Pick<TenantAccessApplicationService, "resendInvitation">>
  createDelivery: () => TenantInvitationDelivery
  generateToken: () => InvitationToken
  generateId: () => string
  appBaseUrl?: string
}>

const SAFE_FAILURE_MESSAGE = "Não foi possível concluir a operação."

export async function resendCompanyMemberInvitation(
  dependencies: ResendCompanyMemberInvitationDependencies,
  input: unknown,
): Promise<ResendCompanyMemberInvitationResult> {
  const parsed = resendInvitationInputSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "Os dados do convite são inválidos." }

  let context: ResendInvitationTenantContextResult
  try {
    context = await dependencies.loadTenantContext()
  } catch {
    return { status: "failed", message: SAFE_FAILURE_MESSAGE }
  }
  if (context.status !== "resolved") return context

  const token = dependencies.generateToken()
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  let persistence: TenantAccessApplicationResult<ResentInvitationPersistenceResult>
  try {
    const service = await dependencies.createApplicationService()
    persistence = await service.resendInvitation({
      companyId: context.companyId,
      invitationId: parsed.data.invitationId,
      expectedGeneration: parsed.data.expectedGeneration,
      tokenDigestHex: token.digestHex,
      idempotencyKey,
      correlationId,
    })
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }

  if (persistence.status !== "succeeded" && persistence.status !== "idempotent_retry") {
    return mapPersistenceFailure(persistence, correlationId)
  }

  const result = persistence.result
  let invitationUrl: string
  let delivery: TenantInvitationDelivery
  try {
    if (!dependencies.appBaseUrl) throw new Error("Missing base URL")
    invitationUrl = new URL(`/invite/${token.rawToken}`, dependencies.appBaseUrl).toString()
    delivery = dependencies.createDelivery()
  } catch {
    return configurationError(result, correlationId)
  }

  let deliveryResult: TenantInvitationDeliveryResult
  try {
    deliveryResult = await delivery.send({
      destinationEmail: result.destinationEmail,
      invitationUrl,
      companyName: context.companyName,
      ...(context.inviterName ? { inviterName: context.inviterName } : {}),
      intendedRole: result.intendedRole,
      expiresAt: result.expiresAt,
      invitationId: result.invitationId,
      generation: result.generation,
      correlationId,
    })
  } catch {
    return {
      status: "invitation_updated_delivery_unknown",
      invitationId: result.invitationId,
      generation: result.generation,
      correlationId,
    }
  }

  return mapDeliveryResult(deliveryResult, result, correlationId)
}

function mapPersistenceFailure(
  result: TenantAccessApplicationResult<ResentInvitationPersistenceResult>,
  correlationId: string,
): ResendCompanyMemberInvitationResult {
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
): ResendCompanyMemberInvitationResult {
  if (code === "TENANT_CONFLICT") {
    return { status: "conflict", reason: "stale_generation", message: "O convite mudou. Recarregue e tente novamente." }
  }
  if (code === "TENANT_INVITE_REVOKED") {
    return { status: "conflict", reason: "revoked", message: "Este convite foi revogado e não pode ser reenviado." }
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

function configurationError(
  result: ResentInvitationPersistenceResult,
  correlationId: string,
): ResendCompanyMemberInvitationResult {
  return {
    status: "configuration_error",
    invitationId: result.invitationId,
    generation: result.generation,
    correlationId,
  }
}

function mapDeliveryResult(
  delivery: TenantInvitationDeliveryResult,
  result: ResentInvitationPersistenceResult,
  correlationId: string,
): ResendCompanyMemberInvitationResult {
  const identity = {
    invitationId: result.invitationId,
    generation: result.generation,
    correlationId,
  }
  if (delivery.outcome === "accepted") return { status: "invitation_sent", ...identity }
  if (delivery.outcome === "unknown") return { status: "invitation_updated_delivery_unknown", ...identity }
  if (delivery.outcome === "configuration_failure") return { status: "configuration_error", ...identity }
  return { status: "invitation_updated_delivery_failed", ...identity }
}

export type { ResendCompanyMemberInvitationDependencies }
