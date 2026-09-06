/**
 * Read-only state of a preserved run — RUNNER ONLY.
 *
 *   npm --workspace apps/web run e2e:inspect-run
 *
 * Answers one question: for every resource the ownership journal records, does it
 * still exist on Review? Nothing else. This command performs **no writes** — no
 * delete, no update, no insert, no archive — and it never contacts anything the
 * journal does not name.
 *
 * It exists because "determine remote state before mutation" is otherwise done by
 * pasting ad-hoc SQL into a console, which is exactly where a stray predicate
 * turns a diagnosis into an incident. Diagnosis deserves a repo-owned command with
 * the same discipline as cleanup.
 *
 * Output is ids and states only. No secrets, no passwords, no person names.
 */

import { adminClient } from "./helpers/admin-client"
import { COMPANY_SCOPED_TABLES } from "./lifecycle/retention-registry"
import { e2eEnv } from "./helpers/env"
import { journalPath, ownedCompanyIds, readJournal } from "./helpers/journal"
import { journalledUserIds } from "./fixtures/tenant-fixture"

type State = "EXISTS" | "MISSING" | "UNKNOWN"

type Row = Readonly<{
  kind: string
  id: string
  tenant: string
  state: State
  detail: string
}>

async function companyState(companyId: string): Promise<{ state: State; detail: string }> {
  const { data, error } = await adminClient()
    .from("companies")
    .select("id, status")
    .eq("id", companyId)
    .maybeSingle()

  if (error) return { state: "UNKNOWN", detail: error.message }
  if (!data) return { state: "MISSING", detail: "row absent" }
  return { state: "EXISTS", detail: `status=${String(data.status)}` }
}

async function userState(userId: string): Promise<{ state: State; detail: string }> {
  const { data, error } = await adminClient().auth.admin.getUserById(userId)
  if (error) {
    if (/not.?found/i.test(error.message)) return { state: "MISSING", detail: "user absent" }
    return { state: "UNKNOWN", detail: error.message }
  }
  return data?.user ? { state: "EXISTS", detail: "auth user present" } : { state: "MISSING", detail: "user absent" }
}

async function personState(personId: string): Promise<{ state: State; detail: string }> {
  const { data, error } = await adminClient()
    .from("people")
    .select("id, company_id, status")
    .eq("id", personId)
    .maybeSingle()

  if (error) return { state: "UNKNOWN", detail: error.message }
  if (!data) return { state: "MISSING", detail: "row absent" }
  return { state: "EXISTS", detail: `status=${String(data.status)}` }
}

async function membershipState(
  companyId: string,
  userId: string,
): Promise<{ state: State; detail: string }> {
  const { data, error } = await adminClient()
    .from("company_members")
    .select("company_id, user_id, role, status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return { state: "UNKNOWN", detail: error.message }
  if (!data) return { state: "MISSING", detail: "row absent" }
  return { state: "EXISTS", detail: `role=${String(data.role)} status=${String(data.status)}` }
}

/**
 * How many immutable audit rows reference a company, and how many name one of the
 * run's own users as actor. These are the two rows that make a company and an auth
 * user undeletable, so counting them is the whole point of the diagnostic.
 */
async function activityEventPressure(
  companyId: string,
  userIds: readonly string[],
): Promise<string> {
  const byCompany = await adminClient()
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  if (byCompany.error) return `activity_events: UNKNOWN (${byCompany.error.message})`

  const byActor = await adminClient()
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .in("actor_id", [...userIds])

  const actorCount = byActor.error ? "UNKNOWN" : String(byActor.count ?? 0)
  return `activity_events referencing company=${byCompany.count ?? 0}, naming a run user as actor=${actorCount}`
}

// The company-scoped table list is CANONICAL and lives in the retention
// registry. inspect-run used to keep its own regex-generated copy, which
// silently omitted every table declared without `if not exists` — including
// development_template_applications, the one that broke run 260906201436-5ecd5f.

/** Row counts per company-scoped table. Counts only — never row contents. */
async function residualGraph(companyId: string): Promise<Array<{ table: string; count: number }>> {
  const found: Array<{ table: string; count: number }> = []

  for (const table of COMPANY_SCOPED_TABLES) {
    const { count, error } = await adminClient()
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)

    if (error) {
      found.push({ table: `${table} (UNREADABLE: ${error.message})`, count: -1 })
      continue
    }
    if ((count ?? 0) > 0) found.push({ table, count: count ?? 0 })
  }

  return found
}

/**
 * Memberships and people that survive under a company, with the fields that
 * decide whether a synthetic login is still usable. Ids and states only.
 */
async function survivingAccess(companyId: string): Promise<void> {
  const members = await adminClient()
    .from("company_members")
    .select("user_id, role, status")
    .eq("company_id", companyId)

  if (members.error) {
    console.log(`  company_members: UNREADABLE (${members.error.message})`)
  } else {
    for (const row of members.data ?? []) {
      console.log(
        `  membership  user=${String(row.user_id)}  role=${String(row.role)}  ` +
          `status=${String(row.status)}`,
      )
    }
    if ((members.data ?? []).length === 0) console.log("  membership  (none)")
  }

  const people = await adminClient()
    .from("people")
    .select("id, user_id, status")
    .eq("company_id", companyId)

  if (people.error) {
    console.log(`  people: UNREADABLE (${people.error.message})`)
  } else {
    for (const row of people.data ?? []) {
      console.log(
        `  person      id=${String(row.id)}  linked_user=${row.user_id ?? "NULL"}  ` +
          `status=${String(row.status)}`,
      )
    }
    if ((people.data ?? []).length === 0) console.log("  person      (none)")
  }
}

async function main(): Promise<void> {
  const env = e2eEnv()
  const journal = readJournal()

  if (!journal) {
    console.log(`[e2e] no ownership journal at ${journalPath()} — nothing to inspect.`)
    return
  }

  if (journal.supabaseRef !== env.supabaseRef) {
    console.error(
      `[e2e] journal was written against ${journal.supabaseRef} but the environment ` +
        `points at ${env.supabaseRef}. Refusing to inspect the wrong project.`,
    )
    process.exitCode = 1
    return
  }

  const tenantA = journal.companyId
  const tenantB = journal.onboardingCompany?.companyId ?? null
  const label = (companyId: string) =>
    companyId === tenantA ? "A (fixture)" : companyId === tenantB ? "B (onboarding UI)" : "?"

  console.log(`[e2e] run              : ${journal.runId}`)
  console.log(`[e2e] supabase ref     : ${journal.supabaseRef}`)
  console.log(`[e2e] READ-ONLY — this command never writes, updates or deletes.\n`)

  const rows: Row[] = []

  for (const companyId of ownedCompanyIds(journal)) {
    const { state, detail } = await companyState(companyId)
    rows.push({ kind: "company", id: companyId, tenant: label(companyId), state, detail })
  }

  for (const resource of journal.owned) {
    if (resource.kind === "membership") {
      const { state, detail } = await membershipState(resource.companyId, resource.userId)
      rows.push({
        kind: "membership",
        id: `${resource.companyId}/${resource.userId}`,
        tenant: label(resource.companyId),
        state,
        detail,
      })
    }
    if (resource.kind === "person") {
      const { state, detail } = await personState(resource.id)
      rows.push({ kind: "person", id: resource.id, tenant: "-", state, detail })
    }
  }

  const userIds = journalledUserIds(journal)
  for (const userId of userIds) {
    const { state, detail } = await userState(userId)
    const owner = journal.users.find((user) => user.userId === userId)
    rows.push({
      kind: "auth.user",
      id: userId,
      tenant: owner ? owner.role : "-",
      state,
      detail,
    })
  }

  const width = Math.max(...rows.map((row) => row.kind.length))
  for (const row of rows) {
    console.log(
      `${row.kind.padEnd(width)}  ${row.id.padEnd(74)}  ${row.tenant.padEnd(18)}  ` +
        `${row.state.padEnd(7)}  ${row.detail}`,
    )
  }

  console.log("")
  for (const companyId of ownedCompanyIds(journal)) {
    const pressure = await activityEventPressure(companyId, userIds)
    console.log(`[e2e] company ${companyId} (${label(companyId)}): ${pressure}`)
  }

  // Full residual graph for any company that survived. The journal knows what the
  // harness created; only the database knows what a surviving tenant still holds,
  // and remediation has to be designed against the second of those.
  for (const companyId of ownedCompanyIds(journal)) {
    const { state } = await companyState(companyId)
    if (state !== "EXISTS") continue

    console.log(`\n[e2e] residual graph for company ${companyId} (${label(companyId)}):`)
    await survivingAccess(companyId)

    const graph = await residualGraph(companyId)
    if (graph.length === 0) {
      console.log("  no rows in any company-scoped table")
    } else {
      for (const entry of graph) {
        console.log(`  ${entry.table.padEnd(40)} rows=${entry.count}`)
      }
    }
  }

  const stillThere = rows.filter((row) => row.state === "EXISTS")
  console.log(
    `\n[e2e] ${stillThere.length} of ${rows.length} journalled resources still exist. ` +
      `No mutation was performed.`,
  )
}

if (process.argv[1] && /inspect-run\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  void main()
}
