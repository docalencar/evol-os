import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { EXPECTED_MAIN, EXPECTED_MIGRATION_SHA, type RemoteSnapshot, type TurnoverObservation } from "./bootstrap-runner"
import type { CanonicalTurnoverTransport } from "./canonical-adapter"
import { REVIEW_REF, TURNOVER_FIXTURE_MARKER } from "./lifecycle"

export type OperationalCredentials = Readonly<{
  supabaseUrl: string
  anonKey: string
  serviceRoleKey: string
  database: Readonly<{ host: string; port: string; user: string; password: string; name: string }>
  emailDomain: string
}>

const INSPECT_SQL = `
set default_transaction_read_only=on;
select json_build_object(
  'serverAddr',inet_server_addr()::text,
  'ledger',coalesce((select json_agg(version order by version) from supabase_migrations.schema_migrations),'[]'::json),
  'migration0142Count',(select count(*) from supabase_migrations.schema_migrations where version like '0142%'),
  'after0142',(select count(*) from supabase_migrations.schema_migrations where version>'0142'),
  'markerCompanyIds',coalesce((select json_agg(id order by id) from public.companies where slug like 'e2e-turnover-durable-%'),'[]'::json),
  'turnoverRpcCount',(select count(*) from pg_proc where oid=to_regprocedure('public.get_company_turnover_v1(uuid,text)')),
  'companyRpcCount',(select count(*) from pg_proc where oid=to_regprocedure('public.create_company_with_owner(text,text)')),
  'peopleRpcCount',(select count(*) from pg_proc where proname='create_tenant_person_v2'),
  'turnoverAuthenticatedExecute',has_function_privilege('authenticated','public.get_company_turnover_v1(uuid,text)','execute')
)::text;`

function rpcError(code: string, error: unknown): never {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "remote failure"
  throw new Error(`${code}: ${message.replace(/eyJ[A-Za-z0-9_.-]+/g, "[REDACTED]")}`)
}

export function operationalReviewTransport(credentials: OperationalCredentials): CanonicalTurnoverTransport {
  const ref = new URL(credentials.supabaseUrl).hostname.split(".")[0]
  if (ref !== REVIEW_REF) throw new Error("TURNOVER_BOOTSTRAP_TARGET_NOT_REVIEW")
  if (credentials.database.user !== `postgres.${REVIEW_REF}` || /^(localhost|127\.|::1$)/.test(credentials.database.host)) throw new Error("TURNOVER_BOOTSTRAP_DATABASE_TARGET_INVALID")
  const admin = createClient(credentials.supabaseUrl, credentials.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const sessions = new Map<string, Readonly<{ email: string; password: string }>>()
  let owner: SupabaseClient | null = null

  return Object.freeze({
    async inspectReview(): Promise<RemoteSnapshot> {
      const output = execFileSync("psql", ["-h", credentials.database.host, "-p", credentials.database.port, "-U", credentials.database.user, "-d", credentials.database.name, "-v", "ON_ERROR_STOP=1", "--no-psqlrc", "-At"], {
        env: { ...process.env, PGPASSWORD: credentials.database.password, PGCONNECT_TIMEOUT: "15" }, input: INSPECT_SQL, encoding: "utf8", timeout: 30_000,
      }).trim().split("\n").at(-1)
      const data = JSON.parse(output ?? "{}") as Record<string, unknown>
      if (!data.serverAddr || data.after0142 !== 0 || data.turnoverRpcCount !== 1 || data.companyRpcCount !== 1 || data.peopleRpcCount !== 1 || data.turnoverAuthenticatedExecute !== true) throw new Error("TURNOVER_BOOTSTRAP_INSPECT_INVARIANT_FAILED")
      return { reviewRef: REVIEW_REF, canonicalMain: EXPECTED_MAIN, ledger: data.ledger as string[], migration0142Count: Number(data.migration0142Count), migration0142Sha256: EXPECTED_MIGRATION_SHA, markerCompanyIds: data.markerCompanyIds as string[], journalRevision: 0 }
    },
    async createSyntheticAuthUser(marker, role) {
      const suffix = randomBytes(12).toString("hex")
      const email = `e2e-turnover-${suffix}@${credentials.emailDomain}`
      const password = randomBytes(32).toString("base64url")
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { fixture_marker: marker, fixture_role: role } })
      if (error || !data.user) rpcError("TURNOVER_BOOTSTRAP_ACTOR_CREATE_FAILED", error)
      sessions.set(data.user.id, { email, password })
      return { userId: data.user.id }
    },
    async callAsUser(userId, _rpc, parameters) {
      const secret = sessions.get(userId)
      if (!secret) throw new Error("TURNOVER_BOOTSTRAP_ACTOR_SESSION_MISSING")
      owner = createClient(credentials.supabaseUrl, credentials.anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { error: authError } = await owner.auth.signInWithPassword(secret)
      if (authError) rpcError("TURNOVER_BOOTSTRAP_OWNER_AUTH_FAILED", authError)
      const { data, error } = await owner.rpc("create_company_with_owner", parameters)
      if (error || !data) rpcError("TURNOVER_BOOTSTRAP_COMPANY_CREATE_FAILED", error)
      const companyId = data as string
      const { data: person, error: personError } = await owner.from("people").select("id").eq("company_id", companyId).eq("user_id", userId).single()
      if (personError || !person) rpcError("TURNOVER_BOOTSTRAP_OWNER_READBACK_FAILED", personError)
      return { companyId, ownerPersonId: person.id as string }
    },
    async callPeopleMutation(companyId, _rpc, marker) {
      if (!owner) throw new Error("TURNOVER_BOOTSTRAP_OWNER_SESSION_MISSING")
      const { data, error } = await owner.rpc("create_tenant_person_v2", { p_company_id: companyId, p_full_name: "E2E Turnover Durable Employee", p_email: null, p_phone: null, p_birth_date: null, p_hire_date: null, p_status: "active", p_team_id: null, p_position_id: null, p_manager_id: null, p_disc_profile: null, p_idempotency_key: `${marker}:employee`, p_position_seniority_profile_id: null })
      if (error || !data) rpcError("TURNOVER_BOOTSTRAP_EMPLOYEE_CREATE_FAILED", error)
      return { personId: String((data as { personId?: string }).personId) }
    },
    async callTurnoverRead(companyId, _rpc, reason): Promise<TurnoverObservation> {
      if (!owner) throw new Error("TURNOVER_BOOTSTRAP_OWNER_SESSION_MISSING")
      const { data, error } = await owner.rpc("get_company_turnover_v1", { p_company_id: companyId, p_reason: reason })
      if (error || !Array.isArray(data)) rpcError("TURNOVER_BOOTSTRAP_OBSERVATION_FAILED", error)
      const current = data.find((row) => row.period_kind === "mtd") as Record<string, unknown> | undefined
      if (!current) throw new Error("TURNOVER_BOOTSTRAP_MTD_MISSING")
      return { companyId, coverageStartedAt: String(current.coverage_started_at), generatedAt: String(current.generated_at), currentAvailability: current.availability as "unavailable", currentUnavailableReason: current.unavailable_reason as "incomplete_coverage" }
    },
    async verifyOwnedFixture(companyId, ownedIds) {
      if (!owner) return false
      const { data, error } = await owner.from("people").select("id").eq("company_id", companyId)
      if (error) return false
      const remote = new Set((data ?? []).map(({ id }) => String(id)))
      return ownedIds.filter((id) => remote.has(id)).length === remote.size
    },
  })
}

export { INSPECT_SQL, TURNOVER_FIXTURE_MARKER }
