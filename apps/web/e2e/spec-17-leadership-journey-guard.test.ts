/** Static contract guards for L-E2E0. No hosted access. */
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const spec = readFileSync(resolve(import.meta.dirname, "specs/17-leadership-journey.spec.ts"), "utf8")
const product = [
  "src/features/manager-intelligence/repositories/leadership-attention-repository-adapter.ts",
  "src/features/manager-intelligence/presenters/attention-queue-presenter.ts",
].map((path) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8")).join("\n")

test("the hosted journey is self-contained and owns both tenants", () => {
  assert.match(spec, /ensureRunOwnedForeignTenant/)
  assert.match(spec, /prepareAssessment\(\)/)
  assert.match(spec, /prepareDevelopmentTemplate\(\)/)
  assert.doesNotMatch(spec, /spec 02|Spec 02|14-assessment|15-development/)
})

test("foreign fixture ownership is explicitly ended before the manager journey", () => {
  const journeyStart = spec.indexOf('test("1-5. authenticates')
  const journeyEnd = spec.indexOf('\n  })', journeyStart)
  const firstJourneyTest = spec.slice(journeyStart, journeyEnd)
  const foreignFixture = firstJourneyTest.indexOf("ensureRunOwnedForeignTenant")
  const foreignSignOut = firstJourneyTest.indexOf("signOutThroughUi(page)")
  const managerLogin = firstJourneyTest.indexOf("enterAs(page, MANAGER)")
  const firstStep = firstJourneyTest.indexOf("steps.add(1)")

  assert.ok(foreignFixture >= 0)
  assert.ok(foreignSignOut > foreignFixture)
  assert.ok(managerLogin > foreignSignOut)
  assert.ok(firstStep > managerLogin)
  assert.match(firstJourneyTest, /await signOutThroughUi\(page\)/)
  assert.match(firstJourneyTest, /await enterAs\(page, MANAGER\)/)
})

test("foreign-person isolation retains the canonical owner identity returned by tenant B", () => {
  assert.match(spec, /const foreignTenant = await ensureRunOwnedForeignTenant\(/)
  assert.match(spec, /foreignOwnerPersonId = foreignTenant\.ownerPersonId/)
  assert.match(
    spec,
    /initialQueue\.some\(\(row\) => row\.subject_id === foreignOwnerPersonId\)/,
  )
  assert.match(spec, /foreignPersonId: foreignOwnerPersonId/)
  assert.doesNotMatch(spec, /personId\(FOREIGN\)/)
})

test("all frozen Leadership steps and durable evidence are explicit", () => {
  for (let step = 1; step <= 12; step += 1) assert.match(spec, new RegExp(`steps\\.add\\(${step}\\)`))
  assert.match(spec, /leadership-journey-evidence\.json/)
  assert.match(spec, /renameSync\(temporary, evidencePath\)/)
  assert.match(spec, /LEADERSHIP_JOURNEY=PASS/)
})

test("routing uses exact owning-domain identities", () => {
  assert.match(spec, /responses\/\$\{responseId\}/)
  assert.match(spec, /applyFor=\$\{personId\(SUBJECT\)\}/)
  assert.match(spec, /development\/plans\/\$\{planId\}/)
  assert.doesNotMatch(spec, /employees\/\$\{|people\/\$\{/)
})

test("formal Feedback follows the canonical product link before durable readback", () => {
  const stepStart = spec.indexOf('test("6-8. routes to Assessment')
  const stepEnd = spec.indexOf('\n  })', stepStart)
  const feedbackStep = spec.slice(stepStart, stepEnd)
  const canonicalState = feedbackStep.indexOf(
    "Esta avaliação já tem uma conversa de feedback aberta.",
  )
  const productLink = feedbackStep.indexOf(
    'getByRole("link", { name: "Abrir conversa de feedback" })',
  )
  const click = feedbackStep.indexOf("openFeedback.click()")
  const routeIdentity = feedbackStep.indexOf("const feedbackThreadId = new URL(page.url())")
  const readback = feedbackStep.indexOf('.from("feedback_threads")')

  assert.ok(canonicalState >= 0)
  assert.ok(productLink > canonicalState)
  assert.ok(click > productLink)
  assert.ok(routeIdentity > click)
  assert.ok(readback > routeIdentity)
  assert.match(feedbackStep, /id: feedbackThreadId/)
  assert.doesNotMatch(
    feedbackStep,
    /getByRole\("button", \{ name: "Criar feedback" \}\)\.click\(\)\s*\n\s*await page\.waitForURL/,
  )
})

test("Leadership remains a trusted read with no direct People dependency", () => {
  assert.match(product, /get_manager_leadership_attention_v1/)
  assert.doesNotMatch(product, /\.from\(["']people["']\)/)
  assert.doesNotMatch(product, /recognition|teamHealth|intelligenceScore|decisionScore/i)
  assert.doesNotMatch(spec, /\.from\(["']people["']\)/)
})

test("failure and empty state remain distinct in the active product", () => {
  const page = readFileSync(
    resolve(import.meta.dirname, "../src/app/(dashboard)/app/manager/page.tsx"), "utf8",
  )
  const errorBoundary = readFileSync(
    resolve(import.meta.dirname, "../src/app/(dashboard)/app/manager/error.tsx"), "utf8",
  )
  assert.match(errorBoundary, /A fila de atenção não foi substituída por um resultado vazio/)
  assert.match(page, /getAttentionQueue/)
})

/* ---------------------------------------------------------------------------
 * L-E2E4 — direct DB readbacks must name canonical columns.
 *
 * Hosted run 260925133926-18822f failed at step 6-8 with SQLSTATE 42703,
 * `column feedback_threads.sender_id does not exist`. The table has always
 * declared sender_employee_id / receiver_employee_id (0043). Auditing the rest of
 * the spec found two more stale identifiers that would each have failed a later
 * step in turn: `status: "active"`, which is not in the feedback_threads CHECK
 * list and is not what 0128 inserts; and development_actions.development_plan_id,
 * which has never existed - actions belong to a goal, and the goal belongs to the
 * plan.
 *
 * The catalog-driven test below is the one that matters. A hand-written list of
 * the three known names would not have caught the second and third, and would not
 * catch the fourth.
 * ------------------------------------------------------------------------- */

const migrations = readdirSync(resolve(import.meta.dirname, "../../../supabase/migrations"))
  .filter((file) => file.endsWith(".sql") && !file.includes(" 2."))
  .map((file) => readFileSync(resolve(import.meta.dirname, "../../../supabase/migrations", file), "utf8"))
  .join("\n")

/** Columns of a table, from its CREATE plus any later ADD COLUMN. */
function canonicalColumns(table: string) {
  const created = new RegExp(
    `create table(?: if not exists)? public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
  ).exec(migrations)
  const columns = new Set(
    created
      ? [...created[1].matchAll(
          /^\s{2,4}([a-z_]+)\s+(?:uuid|text|boolean|timestamptz|date|integer|bigint|jsonb|numeric)/gm,
        )].map((m) => m[1])
      : [],
  )
  for (const m of migrations.matchAll(
    new RegExp(`alter table (?:only )?public\\.${table}\\s*\\n?\\s*add column(?: if not exists)? ([a-z_]+)`, "g"),
  )) columns.add(m[1])
  return columns
}

test("every direct DB readback in the spec names columns that exist in the schema", () => {
  const readbacks = [...spec.matchAll(
    /\.from\("(\w+)"\)([\s\S]{0,260}?)(?=\n\s*(?:const|if|expect|await|\}))/g,
  )]
  assert.ok(readbacks.length >= 4, "the spec must still perform its durable readbacks")

  for (const [, table, body] of readbacks) {
    const columns = canonicalColumns(table)
    assert.ok(columns.size > 0, `no canonical columns found for ${table}`)

    const selected = /\.select\("([^"]+)"\)/.exec(body)
    const used = new Set(selected ? selected[1].split(",") : [])
    for (const m of body.matchAll(/\.(?:eq|in)\("(\w+)"/g)) used.add(m[1])

    const stale = [...used].filter((column) => !columns.has(column))
    assert.deepEqual(stale, [], `${table}: stale column(s) ${stale.join(", ")}`)
  }
})

test("the Feedback readback uses canonical participant columns and the canonical created status", () => {
  const stepStart = spec.indexOf('test("6-8. routes to Assessment')
  const step = spec.slice(stepStart, spec.indexOf("\n  })", stepStart))

  assert.match(step, /sender_employee_id/)
  assert.match(step, /receiver_employee_id/)
  // The retired names must never come back.
  assert.doesNotMatch(step, /\bsender_id\b/)
  assert.doesNotMatch(step, /\breceiver_id\b/)

  // 0128 inserts the thread as `awaiting_acknowledgement`; `active` is not even a
  // permitted value of the status CHECK.
  assert.match(step, /status: "awaiting_acknowledgement"/)
  assert.doesNotMatch(step, /status: "active"/)
  assert.match(migrations, /'awaiting_acknowledgement'/)
})

test("development actions are reached through their goal, never by a plan column", () => {
  assert.doesNotMatch(
    spec,
    /from\("development_actions"\)[\s\S]{0,160}?development_plan_id/,
    "development_actions has no development_plan_id; actions belong to a goal",
  )
  assert.match(spec, /from\("development_goals"\)[\s\S]{0,120}?\.eq\("plan_id", planId\)/)
  assert.match(spec, /from\("development_actions"\)[\s\S]{0,120}?\.in\("goal_id", goalIds\)/)
})

/* ---------------------------------------------------------------------------
 * L-E2E6 — a portal dialog must be opened by its trigger before it is used.
 *
 * Consumed run 260925143012-cc25e5 reached steps 1-8 and then timed out at
 * step 9 waiting for getByRole('dialog').locator('#templateId'). The preserved
 * page snapshot shows no dialog and an ENABLED trigger that was never clicked:
 *
 *   button "Aplicar template para esta pessoa" [ref=e75] [cursor=pointer]
 *
 * Development had already accepted applyFor and revalidated the subject - that
 * label only renders when initialEmployeeId survived the authorized target list -
 * so the product was correct and the harness simply skipped a user action.
 * `#templateId` lives inside CrudCreateDialog, a portal that mounts nothing until
 * its trigger is clicked. Spec 15 documents exactly this and opens the same
 * dialog through a trigger click.
 *
 * The guard is about ORDERING, not about a label: every dialog handle must be
 * preceded by a trigger click, so a future dialog interaction cannot regress the
 * same way.
 * ------------------------------------------------------------------------- */

/**
 * Strip line comments before judging ordering. The correction's own comment names
 * `#templateId` and the trigger label, so a guard that scanned raw text would
 * measure its own documentation — the same mistake this stream has made before.
 */
function codeOf(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .join("\n")
}

test("every portal dialog is opened by clicking its trigger first", () => {
  const code = codeOf(spec)
  const dialogUses = [...code.matchAll(/getByRole\("dialog"\)/g)]
  assert.ok(dialogUses.length > 0, "the journey still interacts with a dialog")

  for (const use of dialogUses) {
    const before = code.slice(0, use.index)
    // The nearest preceding action must be a button click that opens the portal,
    // not a link navigation. A link only routes; it never mounts the dialog.
    const lastTriggerClick = before.lastIndexOf('getByRole("button"')
    const lastLinkClick = before.lastIndexOf('getByRole("link"')

    assert.ok(
      lastTriggerClick > lastLinkClick,
      "a dialog was reached after a link navigation with no trigger click in between: " +
        "the portal mounts nothing until its button is clicked",
    )

    const clickWindow = before.slice(lastTriggerClick)
    assert.match(
      clickWindow,
      /\.click\(\)/,
      "the trigger must actually be clicked before the dialog is used",
    )
  }
})

test("the Development template dialog is opened by its exact preselected trigger", () => {
  const code = codeOf(spec)
  const stepStart = code.indexOf('test("9-11. applies the missing PDI')
  const step = code.slice(stepStart, code.indexOf("\n  })", stepStart))

  const trigger = step.indexOf('"Aplicar template para esta pessoa"')
  const templateSelect = step.indexOf('#templateId')

  assert.ok(trigger >= 0, "the L-P2 preselected trigger label must be used verbatim")
  assert.ok(
    trigger < templateSelect,
    "the trigger must be clicked before #templateId is touched",
  )
  // Opening via the preselected label also asserts that Development revalidated
  // applyFor: the generic "Aplicar template" label renders when it did not.
  assert.doesNotMatch(step, /getByRole\("button", \{ name: "Aplicar template" \}\)/)
})
