import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync(
  new URL("../../../app/(dashboard)/app/people/new/page.tsx", import.meta.url),
  "utf8",
)
const action = readFileSync(
  new URL("../actions/create-employee-action.ts", import.meta.url),
  "utf8",
)
const form = readFileSync(new URL("./employee-form.tsx", import.meta.url), "utf8")
const createPage = readFileSync(
  new URL("./employee-create-page.tsx", import.meta.url),
  "utf8",
)

test("new People route resolves tenant and form options on the server", () => {
  assert.doesNotMatch(page, /["']use client["']/)
  assert.match(page, /getCurrentCompanyContext\(\)/)
  assert.match(page, /getEmployees\(companyId\)/)
  assert.match(page, /getTeams\(companyId\)/)
  assert.match(page, /getPositions\(companyId\)/)
  assert.match(page, /<EmployeeCreatePage/)
  assert.doesNotMatch(page, /createClient|company_members|memberships\?\.\[0\]|\.from\(/)
})

test("employee creation accepts no client-provided tenant selector", () => {
  assert.match(action, /createEmployeeAction\(\s*input: unknown/)
  assert.match(action, /createEmployeeSchema\.safeParse\(input\)/)
  assert.match(action, /getCurrentCompanyContext\(\)/)
  assert.match(action, /employeeRepository\.create\(\s*companyId,/)
  assert.ok(
    action.indexOf("createEmployeeSchema.safeParse(input)") <
      action.indexOf("getCurrentCompanyContext()"),
  )
  assert.match(action, /message: "Erro ao criar colaborador\."/)
  assert.doesNotMatch(action, /error\?\.message/)
  assert.match(action, /revalidatePath\("\/app\/people"\)/)
  assert.match(action, /success: true/)
  assert.doesNotMatch(form, /createEmployeeAction\(\s*companyId/)
})

test("canonical creation form keeps successful and cancelled route navigation", () => {
  assert.match(createPage, /<EmployeeForm/)
  assert.match(createPage, /onSuccess=\{returnToPeople\}/)
  assert.match(createPage, /onCancel=\{returnToPeople\}/)
  assert.match(createPage, /router\.push\("\/app\/people"\)/)
  assert.match(createPage, /router\.refresh\(\)/)
})

test("dead legacy companies browser service is removed", () => {
  assert.equal(
    existsSync(new URL("../../../services/companies.service.ts", import.meta.url)),
    false,
  )
})
