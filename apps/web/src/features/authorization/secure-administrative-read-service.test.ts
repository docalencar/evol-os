import assert from "node:assert/strict"
import test from "node:test"

import {
  AuthorizationError,
  SecureAdministrativeReadService,
  type AdministrativeReadGateway,
  type CurrentUserContext,
} from "."

const request = {
  companyId: "11111111-1111-4111-8111-111111111111",
  scope: "response",
  scopeId: "22222222-2222-4222-8222-222222222222",
  reason: "  review_cycle  ",
}

function context(role: CurrentUserContext["role"]): CurrentUserContext {
  return {
    userId: "33333333-3333-4333-8333-333333333333",
    companyId: request.companyId,
    role,
  }
}

test("leitura administrativa valida papel e normaliza motivo", async () => {
  const received: typeof request[] = []
  const gateway: AdministrativeReadGateway<string> = {
    async read(input) {
      received.push(input as typeof request)
      return "ok"
    },
  }
  const service = new SecureAdministrativeReadService(
    context("hr"),
    gateway
  )

  assert.equal(await service.read(request), "ok")
  assert.equal(received[0]?.reason, "review_cycle")
})

test("manager não executa leitura administrativa", async () => {
  const gateway: AdministrativeReadGateway<string> = {
    async read() {
      return "unexpected"
    },
  }
  const service = new SecureAdministrativeReadService(
    context("manager"),
    gateway
  )

  await assert.rejects(
    async () => service.read(request),
    AuthorizationError
  )
})

test("leitura administrativa exige motivo", async () => {
  const gateway: AdministrativeReadGateway<string> = {
    async read() {
      return "unexpected"
    },
  }
  const service = new SecureAdministrativeReadService(context("owner"), gateway)

  await assert.rejects(
    async () => service.read({ ...request, reason: " " }),
    /ADMINISTRATIVE_READ_REASON_REQUIRED/
  )
})
