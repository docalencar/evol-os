/**
 * D-P3 — the template authoring journey, end to end at the wiring level.
 *
 * Every piece under test is a server component, a `"use server"` action or a
 * `"use client"` component, so none can be imported into a plain node test
 * process. What IS pinned here is the chain each capability must travel —
 * UI → Server Action → service → repository → trusted RPC → canonical readback
 * — and the shapes that would quietly undo it: a legacy reader returning, a
 * browser-supplied version identity, an authoring control surviving publication.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const listPage = read("../../../app/(dashboard)/app/development/templates/page.tsx")
const detailPage = read("../../../app/(dashboard)/app/development/templates/[id]/page.tsx")
const table = read("./components/development-template-table.tsx")
const form = read("./components/development-template-form.tsx")
const publishButton = read("./components/publish-development-template-button.tsx")
const obsoleteButton = read("./components/obsolete-development-template-button.tsx")
const goalDialog = read("./components/add-template-competency-dialog.tsx")
const actionDialog = read("./components/add-template-action-dialog.tsx")

const createAction = read("./actions/create-development-template-action.ts")
const goalAction = read("./actions/create-development-template-goal-action.ts")
const actionAction = read("./actions/create-action-for-template-goal-action.ts")
const publishAction = read("./actions/publish-development-template-action.ts")
const obsoleteAction = read("./actions/obsolete-development-template-action.ts")
const messages = read("./actions/development-template-authoring-message.ts")

const createService = read("./services/create-development-template.ts")
const goalService = read("./services/create-development-template-goal.ts")
const actionService = read("./services/create-action-for-template-goal.ts")
const publishService = read("./services/publish-development-template-version.ts")
const obsoleteService = read("./services/deactivate-development-template.ts")
const repository = read("./repositories/development-template-authoring-repository.ts")
const authoringRead = read("./queries/resolve-development-template-authoring-version.ts")
const catalogRead = read("./queries/get-published-development-template-catalog.ts")
const planList = read("../services/get-development-plan-list-items.ts")

const everyServerFile = [
  createAction, goalAction, actionAction, publishAction, obsoleteAction,
  createService, goalService, actionService, publishService, obsoleteService,
  repository, authoringRead, catalogRead,
].join("\n")

/** Comments necessarily discuss what the code avoids; properties hold in code. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

test("1. the authoring list reads the trusted boundary, not a tenant-wide reader", () => {
  assert.match(listPage, /getDevelopmentTemplateAuthoringVersions\(companyId\)/)
  assert.doesNotMatch(listPage, /getManagementDevelopmentTemplates/)
  assert.match(authoringRead, /get_development_template_authoring_v1/)
})

test("2. drafts are discoverable: the list shows the real lifecycle", () => {
  // The legacy `active` boolean cannot express a draft. Pinning the three
  // states is what keeps a newly created draft from being invisible.
  for (const status of ["draft", "published", "obsolete"]) {
    assert.match(table, new RegExp(`${status}:`))
  }
  assert.doesNotMatch(code(table), /template\.active/)
  assert.match(table, /\/app\/development\/templates\/\$\{template\.templateId\}/)
})

test("3. creating a draft navigates to the canonical container it created", () => {
  assert.match(createService, /create_development_template_draft_v1|repository\.createDraft/)
  // Read back, never predicted: the container id comes from the authoring read.
  assert.match(createService, /getDevelopmentTemplateAuthoringVersions\(companyId\)/)
  assert.match(createService, /DEVELOPMENT_TEMPLATE_DRAFT_NOT_READABLE/)
  assert.match(createAction, /templateId: created\.templateId/)
  assert.match(form, /router\.push\(`\/app\/development\/templates\/\$\{result\.templateId\}`\)/)
})

test("4. the detail page resolves container -> version server-side", () => {
  assert.match(detailPage, /resolveDevelopmentTemplateAuthoringVersion\(companyId, id\)/)
  assert.match(detailPage, /getDevelopmentTemplateVersionContent\(/)
  assert.doesNotMatch(detailPage, /getManagementDevelopmentTemplates/)
  assert.doesNotMatch(code(detailPage), /\.from\(/)
  // The route never accepts a version id from the URL or the client.
  assert.doesNotMatch(code(detailPage), /templateVersionId=\{id\}|searchParams[\s\S]{0,60}version/)
})

test("5-6. a draft exposes goal and action authoring on version identities", () => {
  assert.match(detailPage, /isDraft \? \(\s*<AddTemplateCompetencyDialog/)
  assert.match(detailPage, /templateVersionGoalId=\{goal\.id\}/)
  // The dialogs name the identity they carry, so a container id cannot be
  // passed where a version goal is required without the type changing too.
  assert.match(goalDialog, /templateId: string/)
  assert.match(actionDialog, /templateVersionGoalId: string/)
  assert.doesNotMatch(actionDialog, /templateGoalId\b/)
  assert.match(goalService, /repository\.addGoal/)
  assert.match(actionService, /repository\.addAction/)
  assert.match(repository, /add_development_template_goal_v1/)
  assert.match(repository, /add_development_template_action_v1/)
  // The action path uses the VERSION goal, never the legacy goal table.
  assert.doesNotMatch(code(actionService), /development_template_goals/)
  assert.match(actionAction, /templateVersionGoalId/)
})

test("7-8. publish exists, is draft-only, and goes through the trusted mutation", () => {
  assert.match(detailPage, /isDraft \? \(\s*<PublishDevelopmentTemplateButton/)
  assert.match(publishButton, /publishDevelopmentTemplateAction\(templateId\)/)
  assert.match(publishAction, /publishDevelopmentTemplateVersion\(\{ companyId, templateId \}\)/)
  assert.match(publishService, /version\.status !== "draft"/)
  assert.match(publishService, /repository\.publish\(version\.templateVersionId, version\.revision\)/)
  assert.match(repository, /publish_development_template_version_v1/)
  // The revision guard is the point: a stale page must not publish a draft
  // other than the one it displayed.
  assert.match(repository, /p_expected_revision/)
  assert.match(publishButton, /router\.refresh\(\)/)
})

test("9. a published version exposes no goal or action authoring", () => {
  const draftGate = detailPage.indexOf("const isDraft")
  assert.notEqual(draftGate, -1)
  for (const control of ["<AddTemplateCompetencyDialog", "<AddTemplateActionDialog"]) {
    const at = detailPage.indexOf(control)
    assert.notEqual(at, -1, `${control} must exist`)
    assert.ok(draftGate < at, `${control} must be gated on the draft state`)
  }
  // And there is no server path behind an edit either: no update service, no
  // update action, no legacy write.
  assert.doesNotMatch(everyServerFile, /updateDevelopmentTemplate\b/)
})

test("10-11. obsolete is offered on published only, and never reverses", () => {
  assert.match(detailPage, /isPublished \? \(\s*<ObsoleteDevelopmentTemplateButton/)
  assert.match(table, /template\.status === "published" \? \(/)
  assert.match(obsoleteService, /resolvePublishedDevelopmentTemplateVersion/)
  assert.match(repository, /obsolete_development_template_version_v1/)
  // No obsolete -> published edge anywhere in the application layer.
  assert.doesNotMatch(everyServerFile, /republish|unobsolete|status = ['"]published['"]/)
})

test("12-13. authorization is the database's, and no role matrix is rebuilt here", () => {
  // The pages carry no membership arithmetic: the authoring read returns
  // nothing to a manager or an employee, which is what makes the surface empty
  // for them. A React-side role check would be a second authority.
  for (const source of [listPage, detailPage, table, publishButton, obsoleteButton]) {
    assert.doesNotMatch(
      code(source),
      /role === ['"](owner|admin|hr|manager|employee)['"]|membershipRole|has_company_role/,
    )
  }
  assert.match(authoringRead, /development_actor_is_admin_v1|get_development_template_authoring_v1/)
})

test("14-15. no direct table access and no legacy write path was restored", () => {
  assert.doesNotMatch(code(everyServerFile), /\.from\(["']development_template/)
  assert.doesNotMatch(code(everyServerFile), /\.insert\(|\.update\(|\.delete\(|\.upsert\(/)
  assert.doesNotMatch(code(everyServerFile), /service_role|SUPABASE_SERVICE_ROLE_KEY/)
})

test("16. the plan list decorates through the catalog, not the authoring read", () => {
  // Template NAMES on a participant-scoped plan list must not require
  // administrative visibility, and must not reintroduce a tenant-wide reader.
  assert.match(planList, /getPublishedDevelopmentTemplateCatalog\(companyId\)/)
  assert.doesNotMatch(planList, /getManagementDevelopmentTemplates/)
  assert.doesNotMatch(planList, /getDevelopmentTemplateAuthoringVersions/)
  assert.match(catalogRead, /get_published_development_template_catalog_v1/)
})

test("18. errors are a closed product vocabulary, never database text", () => {
  // The repository translates on the way out, so no caller pattern-matches SQL.
  assert.match(repository, /BOUNDARY_FAILURES/)
  assert.match(repository, /DEVELOPMENT_TEMPLATE_OPERATION_FAILED/)
  for (const action of [createAction, goalAction, actionAction, publishAction, obsoleteAction]) {
    assert.doesNotMatch(action, /error\.message|error instanceof Error \? error\.message/)
  }
  // "Not found" and "forbidden" must read identically: the wording itself must
  // not tell an unauthorized actor that the template exists.
  const forbidden = messages.match(/DEVELOPMENT_TEMPLATE_FORBIDDEN: "([^"]+)"/)?.[1]
  const notFound = messages.match(/DEVELOPMENT_TEMPLATE_NOT_FOUND: "([^"]+)"/)?.[1]
  assert.ok(forbidden && notFound && forbidden === notFound, "opaque refusal wording")
})

test("D-P3 adds no application, execution or review surface", () => {
  const changed = listPage + detailPage + table + form + publishButton + everyServerFile
  assert.doesNotMatch(
    changed,
    /startDevelopmentAction|completeDevelopmentAction|skipDevelopmentAction|recordDevelopmentReview|completeDevelopmentPlan/,
  )
  // The apply dialog predates D-P3 and is left exactly as it was.
  assert.match(detailPage, /<ApplyDevelopmentTemplateDialog/)
  assert.doesNotMatch(code(publishService + createService + goalService), /apply_development_template|reserve_development_template_application/)
})
