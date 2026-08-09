import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

import type { TenantInvitationDeliveryRequest } from "../contracts"
import type { ResendEmailTransport } from "./resend-tenant-invitation-delivery"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "server-only:test" }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") {
      return { format: "module", shortCircuit: true, source: "export {}" }
    }
    return nextLoad(url, context)
  },
})

type TransportResponse = Awaited<ReturnType<ResendEmailTransport["send"]>>
type CapturedSend = Readonly<{
  payload: Parameters<ResendEmailTransport["send"]>[0]
  options: Parameters<ResendEmailTransport["send"]>[1]
}>

class StubResendEmailTransport implements ResendEmailTransport {
  readonly sends: CapturedSend[] = []

  constructor(
    private readonly response: TransportResponse | Error,
  ) {}

  async send(
    payload: CapturedSend["payload"],
    options: CapturedSend["options"],
  ): Promise<TransportResponse> {
    this.sends.push({ payload, options })
    if (this.response instanceof Error) throw this.response
    return this.response
  }
}

const request: TenantInvitationDeliveryRequest = {
  destinationEmail: "invitee@safe.test",
  invitationUrl: "https://app.evol.test/invite/raw-secret-token",
  companyName: "Empresa Exemplo",
  inviterName: "Maria",
  intendedRole: "employee",
  expiresAt: "2026-08-16T12:00:00.000Z",
  invitationId: "550e8400-e29b-41d4-a716-446655440000",
  generation: 3,
  correlationId: "correlation-1",
}

const response = (
  name: string,
  statusCode: number | null,
  message = "safe provider failure",
  headers: Readonly<Record<string, string>> | null = null,
): TransportResponse => ({
  data: null,
  error: { name, statusCode, message },
  headers,
})

const loadAdapter = () => import("./resend-tenant-invitation-delivery")

test("maps the provider request and successful message id", async () => {
  const { ResendTenantInvitationDelivery } = await loadAdapter()
  const transport = new StubResendEmailTransport({
    data: { id: "provider-message-1" },
    error: null,
    headers: null,
  })
  const delivery = new ResendTenantInvitationDelivery(
    transport,
    "Evol OS <convites@evol.test>",
  )

  const result = await delivery.send(request)

  assert.deepEqual(result, {
    outcome: "accepted",
    providerMessageId: "provider-message-1",
  })
  assert.equal(transport.sends.length, 1)
  assert.equal(transport.sends[0]?.payload.from, "Evol OS <convites@evol.test>")
  assert.equal(transport.sends[0]?.payload.to, request.destinationEmail)
  assert.match(transport.sends[0]?.payload.html ?? "", /Acessar convite/)
  assert.match(transport.sends[0]?.payload.text ?? "", /Acesse o convite/)
  assert.deepEqual(transport.sends[0]?.options, {
    idempotencyKey: "invite/550e8400-e29b-41d4-a716-446655440000/3",
  })
})

test("derives delivery idempotency only from invitation identity and generation", async () => {
  const { createTenantInvitationDeliveryIdempotencyKey } = await loadAdapter()

  assert.equal(
    createTenantInvitationDeliveryIdempotencyKey(request.invitationId, 3),
    createTenantInvitationDeliveryIdempotencyKey(request.invitationId, 3),
  )
  assert.notEqual(
    createTenantInvitationDeliveryIdempotencyKey(request.invitationId, 3),
    createTenantInvitationDeliveryIdempotencyKey(request.invitationId, 4),
  )

  const variants = [
    request,
    { ...request, correlationId: "different-correlation" },
    { ...request, destinationEmail: "different@safe.test" },
    { ...request, invitationUrl: "https://app.evol.test/invite/different-token" },
  ]
  assert.deepEqual(
    variants.map(value => createTenantInvitationDeliveryIdempotencyKey(
      value.invitationId,
      value.generation,
    )),
    Array(variants.length).fill("invite/550e8400-e29b-41d4-a716-446655440000/3"),
  )
})

test("maps rate limiting and retry-after from structured response data", async () => {
  const { ResendTenantInvitationDelivery } = await loadAdapter()
  const delivery = new ResendTenantInvitationDelivery(
    new StubResendEmailTransport(response(
      "rate_limit_exceeded",
      429,
      "rate limited",
      { "retry-after": "2" },
    )),
    "sender@evol.test",
  )

  assert.deepEqual(await delivery.send(request), {
    outcome: "transient_failure",
    category: "rate_limited",
    retryAfterMs: 2_000,
  })
})

test("maps provider, configuration, and permanent failures", async () => {
  const { ResendTenantInvitationDelivery } = await loadAdapter()
  const cases: readonly [TransportResponse, unknown][] = [
    [response("internal_server_error", 500), {
      outcome: "transient_failure", category: "provider_unavailable",
    }],
    [response("invalid_api_key", 403), {
      outcome: "configuration_failure", category: "authentication",
    }],
    [response("invalid_from_address", 422), {
      outcome: "configuration_failure", category: "sender_not_verified",
    }],
    [response("validation_error", 422, "Invalid `to` email address"), {
      outcome: "permanent_failure", category: "invalid_recipient",
    }],
    [response("missing_required_field", 422), {
      outcome: "permanent_failure", category: "malformed_request",
    }],
    [response("invalid_idempotent_request", 409), {
      outcome: "permanent_failure", category: "malformed_request",
    }],
    [response("security_error", 451), {
      outcome: "permanent_failure", category: "provider_rejected",
    }],
    [response("concurrent_idempotent_requests", 409), {
      outcome: "unknown", category: "unrecognized_response",
    }],
  ]

  for (const [providerResponse, expected] of cases) {
    const delivery = new ResendTenantInvitationDelivery(
      new StubResendEmailTransport(providerResponse),
      "sender@evol.test",
    )
    assert.deepEqual(await delivery.send(request), expected)
  }
})

test("maps thrown network failures without leaking provider details", async () => {
  const { ResendTenantInvitationDelivery } = await loadAdapter()
  const delivery = new ResendTenantInvitationDelivery(
    new StubResendEmailTransport(new Error(
      `network failed for ${request.destinationEmail} at ${request.invitationUrl}`,
    )),
    "sender@evol.test",
  )

  assert.deepEqual(await delivery.send(request), {
    outcome: "transient_failure",
    category: "network",
  })
})

test("maps timeout and malformed provider success to unknown", async () => {
  const { ResendTenantInvitationDelivery } = await loadAdapter()
  const pendingTransport: ResendEmailTransport = {
    send: () => new Promise(() => undefined),
  }
  const timedDelivery = new ResendTenantInvitationDelivery(
    pendingTransport,
    "sender@evol.test",
    { timeoutMs: 1 },
  )
  const malformedDelivery = new ResendTenantInvitationDelivery(
    new StubResendEmailTransport({ data: null, error: null, headers: null }),
    "sender@evol.test",
  )

  assert.deepEqual(await timedDelivery.send(request), {
    outcome: "unknown",
    category: "timeout",
  })
  assert.deepEqual(await malformedDelivery.send(request), {
    outcome: "unknown",
    category: "unrecognized_response",
  })
})

test("keeps secrets, database concerns, and logging outside the adapter", async () => {
  const adapterSource = await readFile(
    new URL("./resend-tenant-invitation-delivery.ts", import.meta.url),
    "utf8",
  )
  const factorySource = await readFile(
    new URL("../server/create-server-tenant-invitation-delivery.ts", import.meta.url),
    "utf8",
  )
  const productionSource = `${adapterSource}\n${factorySource}`

  assert.match(adapterSource, /^import "server-only"/)
  assert.match(factorySource, /^import "server-only"/)
  assert.doesNotMatch(productionSource, /NEXT_PUBLIC.*RESEND|console\.(?:log|error)/)
  assert.doesNotMatch(productionSource, /service_role|supabase|rawToken|digestHex/)
  assert.doesNotMatch(productionSource, /throw new Error\([^)]*(?:RESEND_API_KEY|invitationUrl)/)
})

test("server composition fails fast without either required environment value", async () => {
  const previousApiKey = process.env.RESEND_API_KEY
  const previousFrom = process.env.EMAIL_FROM
  const { createServerTenantInvitationDelivery } = await import(
    "../server/create-server-tenant-invitation-delivery"
  )

  try {
    delete process.env.RESEND_API_KEY
    process.env.EMAIL_FROM = "sender@evol.test"
    assert.throws(
      () => createServerTenantInvitationDelivery(),
      /environment is not configured/,
    )

    process.env.RESEND_API_KEY = "safe-test-key"
    delete process.env.EMAIL_FROM
    assert.throws(
      () => createServerTenantInvitationDelivery(),
      /environment is not configured/,
    )
  } finally {
    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previousApiKey

    if (previousFrom === undefined) delete process.env.EMAIL_FROM
    else process.env.EMAIL_FROM = previousFrom
  }
})
