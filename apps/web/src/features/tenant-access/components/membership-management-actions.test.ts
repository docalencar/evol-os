import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./membership-management-actions.tsx", import.meta.url), "utf8")
const context = readFileSync(new URL("../actions/membership-management-tenant-context.ts", import.meta.url), "utf8")
const actions = [
  "change-company-membership-role-action.ts",
  "deactivate-company-membership-action.ts",
  "transfer-company-ownership-action.ts",
].map((name) => readFileSync(new URL(`../actions/${name}`, import.meta.url), "utf8")).join("\n")

test("client sends only target identity, expected state and requested change", () => {
  assert.match(source, /changeCompanyMembershipRoleAction\(\{\s*membershipId:/)
  assert.match(source, /deactivateCompanyMembershipAction\(\{\s*membershipId:/)
  assert.match(source, /transferCompanyOwnershipAction\(\{\s*targetMembershipId:/)
  for (const forbidden of [
    /companyId/, /actorUserId/, /expectedActorRole/, /idempotencyKey/, /correlationId/,
    /createClient/, /Supabase/, /\.rpc\(/, /\.from\(/, /company_members/,
    /company_member_invitations/, /service_role/, /localStorage/, /auth\.jwt/,
    /request\.jwt/, /token/, /digest/,
  ]) assert.doesNotMatch(source, forbidden)
})

test("server actions use preference-aware context and server-generated IDs", () => {
  assert.match(context, /loadPreferenceAwareCurrentUserContext\(supabase, user\)/)
  assert.match(context, /companyId: currentUser\.companyId/)
  assert.match(context, /actorRole: currentUser\.role/)
  assert.match(actions, /generateId: randomUUID/)
  assert.doesNotMatch(actions, /service_role|company_members|\.from\(/)
})

test("role, deactivation and transfer UX are explicit and accessible", () => {
  assert.match(source, />Alterar papel</)
  assert.match(source, /disabled=\{option\.value === accessState\.membershipRole\}/)
  assert.match(source, /Desativar acesso/)
  assert.match(source, /O cadastro da pessoa não será excluído/)
  assert.match(source, />Transferir propriedade</)
  assert.match(source, /name="demote-actor"/)
  assert.match(source, /role=\{feedback\.tone === "error" \? "alert" : "status"\}/)
  assert.match(source, /submissionInFlight\.current/)
})

test("successful mutations refresh and context loss redirects explicitly", () => {
  assert.match(source, /router\.refresh\(\)/)
  assert.match(source, /replace\("\/login"\)/)
  assert.match(source, /replace\("\/select-company"\)/)
  assert.match(source, /replace\("\/onboarding"\)/)
})

test("deactivation feedback remains inside the open confirmation dialog", () => {
  const deactivation = source.slice(
    source.indexOf("function DeactivateMembershipDialog"),
    source.indexOf("function TransferOwnershipDialog"),
  )
  assert.match(
    deactivation,
    /<AlertDialogContent>[\s\S]*<FeedbackMessage[\s\S]*<\/AlertDialogContent>/,
  )
})
