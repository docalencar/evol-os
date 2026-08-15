import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type {
  ChangeTenantMembershipRoleIntent,
  DeactivateTenantMembershipIntent,
  TenantAccessApplicationResult,
  TransferTenantOwnershipIntent,
} from "../application"
import type { MembershipManagementDependencies } from "./manage-company-membership"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

const membershipId = "11111111-1111-4111-8111-111111111111"
const roleInput = { membershipId, expectedRole: "employee" as const, expectedStatus: "active" as const, newRole: "manager" as const }
const deactivateInput = { membershipId, expectedRole: "employee" as const, expectedStatus: "active" as const }
const transferInput = { targetMembershipId: membershipId, expectedTargetRole: "admin" as const, demoteActor: true }

async function moduleUnderTest() {
  return import("./manage-company-membership")
}

function fixture() {
  const roleIntents: ChangeTenantMembershipRoleIntent[] = []
  const deactivateIntents: DeactivateTenantMembershipIntent[] = []
  const transferIntents: TransferTenantOwnershipIntent[] = []
  const ids = ["server-idempotency", "server-correlation"]
  let index = 0
  const dependencies: MembershipManagementDependencies = {
    loadTenantContext: async () => ({ status: "resolved", companyId: "server-company", actorRole: "owner" }),
    createApplicationService: async () => ({
      changeMembershipRole: async (intent) => {
        roleIntents.push(intent)
        return { status: "succeeded", operationId: "operation", result: { membershipId, role: intent.newRole } }
      },
      deactivateMembership: async (intent) => {
        deactivateIntents.push(intent)
        return { status: "succeeded", operationId: "operation", result: { membershipId, personId: null, status: "inactive" } }
      },
      transferOwnership: async (intent) => {
        transferIntents.push(intent)
        return { status: "succeeded", operationId: "operation", result: { targetMembershipId: membershipId, targetRole: "owner", actorDemoted: intent.demoteActor } }
      },
    }),
    generateId: () => ids[index++] ?? "unexpected",
  }
  return { dependencies, roleIntents, deactivateIntents, transferIntents }
}

test("role change derives tenant and operation identities on the server", async () => {
  const { changeCompanyMembershipRole } = await moduleUnderTest()
  const state = fixture()
  const result = await changeCompanyMembershipRole(state.dependencies, roleInput)
  assert.equal(result.status, "membership_role_changed")
  assert.deepEqual(state.roleIntents, [{
    companyId: "server-company",
    ...roleInput,
    idempotencyKey: "server-idempotency",
    correlationId: "server-correlation",
  }])
})

test("deactivation preserves expected state and server authority", async () => {
  const { deactivateCompanyMembership } = await moduleUnderTest()
  const state = fixture()
  assert.equal((await deactivateCompanyMembership(state.dependencies, deactivateInput)).status, "membership_deactivated")
  assert.deepEqual(state.deactivateIntents[0], {
    companyId: "server-company",
    ...deactivateInput,
    idempotencyKey: "server-idempotency",
    correlationId: "server-correlation",
  })
})

test("ownership transfer derives expected actor role from server context", async () => {
  const { transferCompanyOwnership } = await moduleUnderTest()
  const state = fixture()
  assert.equal((await transferCompanyOwnership(state.dependencies, transferInput)).status, "ownership_transferred")
  assert.deepEqual(state.transferIntents[0], {
    companyId: "server-company",
    ...transferInput,
    expectedActorRole: "owner",
    idempotencyKey: "server-idempotency",
    correlationId: "server-correlation",
  })
})

test("strict schemas reject malformed and expanded browser input before context", async () => {
  const membershipManagement = await moduleUnderTest()
  for (const [operation, input] of [
    [membershipManagement.changeCompanyMembershipRole, { ...roleInput, membershipId: "bad" }],
    [membershipManagement.changeCompanyMembershipRole, { ...roleInput, newRole: "root" }],
    [membershipManagement.deactivateCompanyMembership, { ...deactivateInput, companyId: "client-company" }],
    [membershipManagement.transferCompanyOwnership, { ...transferInput, expectedActorRole: "owner" }],
  ] as const) {
    let loaded = false
    const state = fixture()
    const dependencies = { ...state.dependencies, loadTenantContext: async () => {
      loaded = true
      return { status: "resolved" as const, companyId: "server-company", actorRole: "owner" as const }
    } }
    assert.equal((await operation(dependencies, input)).status, "invalid_input")
    assert.equal(loaded, false)
  }
})

test("context terminal states stop before persistence", async () => {
  const { changeCompanyMembershipRole } = await moduleUnderTest()
  for (const status of ["session_expired", "no_membership", "tenant_selection_required"] as const) {
    const state = fixture()
    const result = await changeCompanyMembershipRole({
      ...state.dependencies,
      loadTenantContext: async () => ({ status }),
    }, roleInput)
    assert.deepEqual(result, { status })
    assert.equal(state.roleIntents.length, 0)
  }
})

test("safe failure mapping covers denied, stale, last owner and unknown failures", async () => {
  const { deactivateCompanyMembership } = await moduleUnderTest()
  const cases = [
    [{ status: "denied", code: "TENANT_AUTHORIZATION_DENIED" }, "denied"],
    [{ status: "conflict", code: "TENANT_CONFLICT" }, "conflict"],
    [{ status: "conflict", code: "LAST_ACTIVE_OWNER_REQUIRED" }, "last_owner"],
    [{ status: "known_failure", code: "TENANT_MEMBERSHIP_NOT_FOUND" }, "invalid_input"],
    [{ status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }, "failed"],
  ] as const
  for (const [persistence, expected] of cases) {
    const state = fixture()
    const dependencies = { ...state.dependencies, createApplicationService: async () => ({
      changeMembershipRole: async () => persistence as TenantAccessApplicationResult<never>,
      deactivateMembership: async () => persistence as TenantAccessApplicationResult<never>,
      transferOwnership: async () => persistence as TenantAccessApplicationResult<never>,
    }) }
    const result = await deactivateCompanyMembership(dependencies, deactivateInput)
    assert.equal(result.status, expected)
    assert.equal(JSON.stringify(result).includes("TENANT_"), false)
  }
})

test("last owner and stale messages are safe and actionable", async () => {
  const { deactivateCompanyMembership } = await moduleUnderTest()
  const state = fixture()
  const lastOwner = { status: "conflict", code: "LAST_ACTIVE_OWNER_REQUIRED" } as const
  const dependencies = { ...state.dependencies, createApplicationService: async () => ({
    changeMembershipRole: async () => lastOwner,
    deactivateMembership: async () => lastOwner,
    transferOwnership: async () => lastOwner,
  }) }
  const result = await deactivateCompanyMembership(dependencies, deactivateInput)
  assert.deepEqual(result, {
    status: "last_owner",
    message: "Não é possível desativar ou rebaixar o último proprietário ativo da empresa.",
  })
})
