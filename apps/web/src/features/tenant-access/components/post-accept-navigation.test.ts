import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { resolve } from "node:path"
import test from "node:test"

import { resolveActiveTenantMemberships } from "@/features/authorization/tenant-resolution"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8")

const panel = read("src/features/tenant-access/components/invitation-accept-panel.tsx")
const appPage = read("src/app/(dashboard)/app/page.tsx")
const onboarding = read("src/app/onboarding/page.tsx")
const currentCompany = read("src/lib/supabase/supabase/current-company.ts")
const middleware = read("src/middleware.ts")

// --- Continue button (client) ---------------------------------------------

test("success renders an enabled Continue button that navigates on human click", () => {
  assert.match(panel, /invitation_accepted/)
  assert.match(panel, /onClick=\{handleContinue\}/)
  assert.doesNotMatch(panel, /Continuar para o Evol OS[\s\S]{0,80}disabled/)
})

test("post-accept destination is a fixed internal path with no tenant/token/authority", () => {
  assert.match(panel, /POST_ACCEPT_DESTINATION = "\/app"/)
  assert.match(panel, /router\.push\(POST_ACCEPT_DESTINATION\)/)
  assert.doesNotMatch(panel, /router\.push\([^)]*(\?|\$\{|companyId|token|email|\brole\b)/i)
})

test("continue navigation refreshes stale cache but creates no membership and calls no RPC", () => {
  assert.match(panel, /router\.refresh\(\)/)
  assert.doesNotMatch(panel, /\.rpc\(|service_role|company_member_invitations|company_members|\.from\("people"\)/)
  assert.doesNotMatch(panel, /useEffect/)
})

// --- /app resolution (server) ---------------------------------------------

test("/app resolves the tenant via getCurrentCompanyContext and does not gate on owner/admin", () => {
  assert.match(appPage, /getCurrentCompanyContext\(\)/)
  assert.doesNotMatch(appPage, /role\s*===\s*["'](owner|admin)|requireOwner|requireAdmin/)
})

test("current-company resolver sends membership-less users to onboarding, others resolve", () => {
  assert.match(currentCompany, /membership_not_found/)
  assert.match(currentCompany, /redirect\("\/onboarding"\)/)
})

// --- onboarding isolation --------------------------------------------------

test("onboarding redirects any active-membership user to /app and only offers creation with no membership", () => {
  assert.match(onboarding, /getOnboardingAccessState\(supabase\)/)
  assert.match(onboarding, /accessState === "membership_exists"[\s\S]{0,40}redirect\("\/app"\)/)
  assert.match(onboarding, /CompanyOnboardingForm/)
  assert.doesNotMatch(onboarding, /\.from\("company_members"\)/)
})

// --- middleware ------------------------------------------------------------

test("middleware keeps /app protected and /invite public", () => {
  assert.match(middleware, /pathname\.startsWith\("\/app"\)/)
  assert.doesNotMatch(middleware, /invite/)
})

// --- tenant resolver (pure) for the newly-accepted employee ----------------

test("a newly-accepted employee with one active membership resolves deterministically", () => {
  const resolution = resolveActiveTenantMemberships([
    { companyId: "company-a", role: "employee", status: "active" },
  ])
  assert.deepEqual(resolution, {
    status: "resolved",
    companyId: "company-a",
    membership: { companyId: "company-a", role: "employee" },
  })
})

test("no active membership yields no_membership (onboarding path), never a browser-chosen tenant", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships([
      { companyId: "company-a", role: "employee", status: "invited" },
    ]),
    { status: "no_membership" },
  )
})

test("multiple active memberships require explicit selection, not a silent pick", () => {
  const resolution = resolveActiveTenantMemberships([
    { companyId: "company-a", role: "employee", status: "active" },
    { companyId: "company-b", role: "admin", status: "active" },
  ])
  assert.equal(resolution.status, "tenant_selection_required")
})
