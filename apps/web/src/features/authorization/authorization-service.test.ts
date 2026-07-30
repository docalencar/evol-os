import assert from "node:assert/strict"
import test from "node:test"

import {
  AuthorizationError,
  AuthorizationService,
  PERMISSION_CATALOG,
  resolvePermissions,
  type AuthorizationAuditEvent,
  type CurrentUserContext,
} from "."

const companyId = "11111111-1111-4111-8111-111111111111"

function context(
  role: CurrentUserContext["role"],
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return {
    userId: "22222222-2222-4222-8222-222222222222",
    companyId,
    role,
    ...overrides,
  }
}

test("papéis administrativos recebem todas as permissões", () => {
  for (const role of ["owner", "admin", "hr"] as const) {
    assert.deepEqual(
      resolvePermissions(role),
      Object.values(PERMISSION_CATALOG)
    )
  }
})

test("manager e employee possuem somente leitura de planejamento", () => {
  for (const role of ["manager", "employee"] as const) {
    assert.deepEqual(resolvePermissions(role), [
      PERMISSION_CATALOG.ORGANIZATION_PLANNING_READ,
    ])
  }
})

test("autoriza a permissão do papel e produz evento de auditoria", async () => {
  const events: AuthorizationAuditEvent[] = []
  const authorization = new AuthorizationService(
    context("hr"),
    (event) => {
      events.push(event)
    }
  )

  const event = await authorization.requirePermission(
    PERMISSION_CATALOG.ORGANIZATION_PLANNING_MANAGE,
    companyId
  )

  assert.equal(event.decision, "allowed")
  assert.deepEqual(events, [event])
})

test("nega papel sem permissão e registra a decisão", async () => {
  const events: AuthorizationAuditEvent[] = []
  const authorization = new AuthorizationService(
    context("manager"),
    (event) => {
      events.push(event)
    }
  )

  await assert.rejects(
    authorization.requirePermission(
      PERMISSION_CATALOG.ORGANIZATION_PLANNING_MANAGE,
      companyId
    ),
    AuthorizationError
  )
  assert.equal(events[0]?.decision, "denied")
})

test("nega acesso entre empresas mesmo para owner", async () => {
  const authorization = new AuthorizationService(context("owner"))

  await assert.rejects(
    authorization.requirePermission(
      PERMISSION_CATALOG.ORGANIZATION_PLANNING_PUBLISH,
      "33333333-3333-4333-8333-333333333333"
    ),
    AuthorizationError
  )
})
