import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const action = readFileSync(
  new URL("./create-employee-import-sync-plan-action.ts", import.meta.url),
  "utf8"
)

test("A. import planning no longer uses the legacy direct-read queries", () => {
  // The privilege-dead direct-table reads must be gone from the active planner.
  assert.doesNotMatch(action, /\bgetDepartments\b/)
  assert.doesNotMatch(action, /\bgetTeams\b/)
  assert.doesNotMatch(action, /\bgetPositions\b/)
  assert.doesNotMatch(action, /\bgetEmployees\b/)
  assert.doesNotMatch(action, /from "@\/features\/organization\/departments"/)
  assert.doesNotMatch(action, /from "@\/features\/organization\/teams"/)
  assert.doesNotMatch(action, /from "@\/features\/organization\/positions"/)
  assert.doesNotMatch(action, /from "@\/features\/people"/)
})

test("B. import planning reads through the trusted management boundaries", () => {
  assert.match(action, /from "@\/features\/dashboard-read"/)
  for (const fn of [
    "getManagementDepartments",
    "getManagementTeams",
    "getManagementPositions",
    "getManagementPeople",
  ]) {
    assert.ok(action.includes(`${fn}(companyId)`), fn)
  }
})

test("C. the trusted rows still feed the same current-snapshot builder", () => {
  assert.match(action, /createCurrentSnapshot\(/)
  // The four reads populate departments/teams/positions/employees for the snapshot.
  assert.match(
    action,
    /\[departments, teams, positions, employees\] = await Promise\.all/
  )
})

test("D. plan / review / dry-run behavior is unchanged", () => {
  assert.match(action, /createDesiredSnapshot\(/)
  assert.match(action, /createOrganizationSyncPlan\(/)
  assert.match(action, /createOrganizationDryRunReport\(/)
  assert.match(action, /presentOrganizationSyncWorkspace\(/)
  assert.match(action, /presentOrganizationSyncReview\(/)
  assert.match(action, /presentOrganizationDryRun\(/)
})

test("E. a trusted-read failure is mapped to a safe result, not a 500", () => {
  assert.match(action, /try \{/)
  assert.match(action, /\} catch \{/)
  assert.match(
    action,
    /Não foi possível carregar a estrutura atual da organização\./
  )
  // The failure returns the typed failure shape, not a thrown error.
  assert.match(action, /success: false,[\s\S]*plan: null,/)
})

test("no apply-path or persistence change is introduced by the read cutover", () => {
  assert.doesNotMatch(action, /applyOrganizationSyncPlan|createEmployeeRepository|\.insert\(/)
})
