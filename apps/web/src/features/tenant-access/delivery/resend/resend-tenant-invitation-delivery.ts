import "server-only"

import type {
  TenantInvitationDeliveryRequest,
  TenantInvitationDeliveryResult,
} from "../contracts"
import type { TenantInvitationDelivery } from "../ports"
import { renderTenantInvitationEmail } from "../template/render-tenant-invitation-email"

const DEFAULT_TIMEOUT_MS = 10_000

type ResendTransportError = Readonly<{
  name: string
  message: string
  statusCode: number | null
}>

type ResendTransportResponse = Readonly<{
  data: Readonly<{ id: string }> | null
  error: ResendTransportError | null
  headers?: Readonly<Record<string, string>> | null
}>

type ResendEmailPayload = Readonly<{
  from: string
  to: string
  subject: string
  html: string
  text: string
}>

export interface ResendEmailTransport {
  send(
    payload: ResendEmailPayload,
    options: Readonly<{ idempotencyKey: string }>,
  ): Promise<ResendTransportResponse>
}

type ResendTenantInvitationDeliveryOptions = Readonly<{
  timeoutMs?: number
}>

const TIMEOUT = Symbol("resend-timeout")

export function createTenantInvitationDeliveryIdempotencyKey(
  invitationId: string,
  generation: number,
): string {
  return `invite/${invitationId}/${generation}`
}

export class ResendTenantInvitationDelivery implements TenantInvitationDelivery {
  private readonly timeoutMs: number

  constructor(
    private readonly transport: ResendEmailTransport,
    private readonly from: string,
    options: ResendTenantInvitationDeliveryOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async send(
    request: TenantInvitationDeliveryRequest,
  ): Promise<TenantInvitationDeliveryResult> {
    const rendered = renderTenantInvitationEmail(request)
    const idempotencyKey = createTenantInvitationDeliveryIdempotencyKey(
      request.invitationId,
      request.generation,
    )
    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
      const response = await Promise.race([
        this.transport.send(
          {
            from: this.from,
            to: request.destinationEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          },
          { idempotencyKey },
        ),
        new Promise<typeof TIMEOUT>(resolve => {
          timeout = setTimeout(() => resolve(TIMEOUT), this.timeoutMs)
        }),
      ])

      if (response === TIMEOUT) {
        return { outcome: "unknown", category: "timeout" }
      }

      return mapResendResponse(response)
    } catch {
      return { outcome: "transient_failure", category: "network" }
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }
}

function mapResendResponse(
  response: ResendTransportResponse,
): TenantInvitationDeliveryResult {
  if (response.data?.id && response.error === null) {
    return { outcome: "accepted", providerMessageId: response.data.id }
  }

  if (!response.error) {
    return { outcome: "unknown", category: "unrecognized_response" }
  }

  const { error } = response

  if (
    error.statusCode === 429 ||
    error.name === "rate_limit_exceeded" ||
    error.name === "daily_quota_exceeded" ||
    error.name === "monthly_quota_exceeded"
  ) {
    const retryAfterMs = parseRetryAfterMs(response.headers?.["retry-after"])
    return retryAfterMs === undefined
      ? { outcome: "transient_failure", category: "rate_limited" }
      : { outcome: "transient_failure", category: "rate_limited", retryAfterMs }
  }

  if (
    (error.statusCode !== null && error.statusCode >= 500) ||
    error.name === "application_error" ||
    error.name === "internal_server_error"
  ) {
    return { outcome: "transient_failure", category: "provider_unavailable" }
  }

  if (
    error.name === "missing_api_key" ||
    error.name === "restricted_api_key" ||
    error.name === "invalid_api_key"
  ) {
    return { outcome: "configuration_failure", category: "authentication" }
  }

  if (error.name === "invalid_from_address" || isUnverifiedSender(error)) {
    return { outcome: "configuration_failure", category: "sender_not_verified" }
  }

  if (isInvalidRecipient(error)) {
    return { outcome: "permanent_failure", category: "invalid_recipient" }
  }

  if (
    error.name === "invalid_idempotency_key" ||
    error.name === "invalid_idempotent_request" ||
    error.name === "invalid_parameter" ||
    error.name === "missing_required_field" ||
    error.name === "validation_error"
  ) {
    return { outcome: "permanent_failure", category: "malformed_request" }
  }

  if (error.name === "concurrent_idempotent_requests") {
    return { outcome: "unknown", category: "unrecognized_response" }
  }

  if (error.name === "security_error") {
    return { outcome: "permanent_failure", category: "provider_rejected" }
  }

  return { outcome: "unknown", category: "unrecognized_response" }
}

function isUnverifiedSender(error: ResendTransportError): boolean {
  return error.name === "validation_error" && error.statusCode === 403
}

function isInvalidRecipient(error: ResendTransportError): boolean {
  return error.name === "validation_error" &&
    error.statusCode === 422 &&
    /(?:recipient|`to`|email address)/i.test(error.message)
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : undefined
}
