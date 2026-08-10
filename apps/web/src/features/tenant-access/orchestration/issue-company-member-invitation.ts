import "server-only"

import { z } from "zod"

import type {
  TenantAccessApplicationResult,
  TenantAccessStableErrorCode,
  TenantAccessApplicationService,
  InvitationPersistenceResult,
} from "../application"
import type {
  TenantInvitationDelivery,
  TenantInvitationDeliveryResult,
} from "../delivery"
import type { InvitationToken } from "../token"

const membershipRoles = ["owner", "admin", "hr", "manager", "employee"] as const

const issueInvitationInputSchema = z.object({
  personId: z.string().uuid(),
  intendedRole: z.enum(membershipRoles),
}).strict()

export type IssueCompanyMemberInvitationInput = z.input<typeof issueInvitationInputSchema>

export type IssueCompanyMemberInvitationResult =
  | Readonly<{ status: "invitation_sent"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "invitation_created_delivery_failed"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "invitation_created_delivery_unknown"; invitationId: string; generation: number; correlationId: string }>
  | Readonly<{ status: "configuration_error"; invitationId?: string; generation?: number; correlationId: string }>
  | Readonly<{ status: "conflict"; reason?: "pending_invitation" | "already_linked"; message: string }>
  | Readonly<{ status: "denied"; message: string }>
  | Readonly<{ status: "invalid_input"; message: string }>
  | Readonly<{ status: "session_expired" }>
  | Readonly<{ status: "no_membership" }>
  | Readonly<{ status: "tenant_selection_required" }>
  | Readonly<{ status: "failed"; correlationId?: string; message: string }>

type ResolvedIssueInvitationTenantContext = Readonly<{
  status: "resolved"
  companyId: string
  companyName: string
  inviterName?: string
  findPersonEmail: (personId: string) => Promise<string | null>
}>

export type IssueInvitationTenantContextResult =
  | ResolvedIssueInvitationTenantContext
  | Readonly<{ status: "session_expired" | "no_membership" | "tenant_selection_required" }>

type IssueCompanyMemberInvitationDependencies = Readonly<{
  loadTenantContext: () => Promise<IssueInvitationTenantContextResult>
  createApplicationService: () => Promise<Pick<TenantAccessApplicationService, "issueInvitation">>
  createDelivery: () => TenantInvitationDelivery
  generateToken: () => InvitationToken
  generateId: () => string
  appBaseUrl?: string
}>

const SAFE_FAILURE_MESSAGE = "Não foi possível concluir a operação."

export async function issueCompanyMemberInvitation(
  dependencies: IssueCompanyMemberInvitationDependencies,
  input: unknown,
): Promise<IssueCompanyMemberInvitationResult> {
  const parsed = issueInvitationInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "invalid_input", message: "Os dados do convite são inválidos." }
  }

  let context: IssueInvitationTenantContextResult
  try {
    context = await dependencies.loadTenantContext()
  } catch {
    return { status: "failed", message: SAFE_FAILURE_MESSAGE }
  }

  if (context.status !== "resolved") return context

  let targetEmail: string | null
  try {
    targetEmail = await context.findPersonEmail(parsed.data.personId)
  } catch {
    targetEmail = null
  }
  if (!targetEmail) {
    return { status: "invalid_input", message: "Não foi possível identificar a pessoa informada." }
  }

  const token = dependencies.generateToken()
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  let persistence: TenantAccessApplicationResult<InvitationPersistenceResult>
  try {
    const applicationService = await dependencies.createApplicationService()
    persistence = await applicationService.issueInvitation({
      companyId: context.companyId,
      personId: parsed.data.personId,
      targetEmail,
      intendedRole: parsed.data.intendedRole,
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

  const { invitationId, generation, expiresAt } = persistence.result
  if (generation === undefined || expiresAt === undefined) {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }

  let invitationUrl: string
  let delivery: TenantInvitationDelivery
  try {
    if (!dependencies.appBaseUrl) throw new Error("Missing base URL")
    invitationUrl = new URL(`/invite/${token.rawToken}`, dependencies.appBaseUrl).toString()
    delivery = dependencies.createDelivery()
  } catch {
    return { status: "configuration_error", invitationId, generation, correlationId }
  }

  let deliveryResult: TenantInvitationDeliveryResult
  try {
    deliveryResult = await delivery.send({
      destinationEmail: targetEmail,
      invitationUrl,
      companyName: context.companyName,
      ...(context.inviterName ? { inviterName: context.inviterName } : {}),
      intendedRole: parsed.data.intendedRole,
      expiresAt,
      invitationId,
      generation,
      correlationId,
    })
  } catch {
    return { status: "invitation_created_delivery_unknown", invitationId, generation, correlationId }
  }

  return mapDeliveryResult(deliveryResult, invitationId, generation, correlationId)
}

function mapPersistenceFailure(
  result: TenantAccessApplicationResult<InvitationPersistenceResult>,
  correlationId: string,
): IssueCompanyMemberInvitationResult {
  if ("result" in result) {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  if (result.status === "denied") {
    return { status: "denied", message: "Você não tem permissão para esta ação." }
  }
  if (result.status === "unexpected_persistence_failure") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  return mapStableFailure(result.code, result.status)
}

function mapStableFailure(
  code: TenantAccessStableErrorCode,
  persistenceStatus: "conflict" | "known_failure",
): IssueCompanyMemberInvitationResult {
  if (code === "TENANT_MEMBERSHIP_ALREADY_EXISTS") {
    return { status: "conflict", reason: "already_linked", message: "Esta pessoa já possui acesso." }
  }
  if (code === "TENANT_PERSON_ALREADY_LINKED") {
    return { status: "conflict", reason: "already_linked", message: "Esta pessoa já possui acesso." }
  }
  if (code === "TENANT_CONFLICT") {
    return { status: "conflict", reason: "pending_invitation", message: "Já existe um convite pendente para esta pessoa." }
  }
  if (
    code === "TENANT_INVITE_IDENTITY_INVALID" ||
    code === "TENANT_INVITE_INVALID" ||
    code === "TENANT_OPERATION_INVALID" ||
    code === "TENANT_ROLE_INVALID"
  ) {
    return { status: "invalid_input", message: "Os dados do convite são inválidos." }
  }
  if (persistenceStatus === "conflict") {
    return { status: "conflict", message: "O convite não pôde ser criado no estado atual." }
  }
  return { status: "failed", message: SAFE_FAILURE_MESSAGE }
}

function mapDeliveryResult(
  result: TenantInvitationDeliveryResult,
  invitationId: string,
  generation: number,
  correlationId: string,
): IssueCompanyMemberInvitationResult {
  if (result.outcome === "accepted") {
    return { status: "invitation_sent", invitationId, generation, correlationId }
  }
  if (result.outcome === "unknown") {
    return { status: "invitation_created_delivery_unknown", invitationId, generation, correlationId }
  }
  if (result.outcome === "configuration_failure") {
    return { status: "configuration_error", invitationId, generation, correlationId }
  }
  return { status: "invitation_created_delivery_failed", invitationId, generation, correlationId }
}

export type { IssueCompanyMemberInvitationDependencies }
