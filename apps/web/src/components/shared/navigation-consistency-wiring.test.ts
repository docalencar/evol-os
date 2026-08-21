import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const backLink = read("./entity-back-link.tsx")
const dialog = read("./entity-dialog.tsx")
const wizard = read("../product/wizard/product-wizard.tsx")

const peopleDetail = read("../../app/(dashboard)/app/people/[id]/page.tsx")
const teamDetail = read("../../app/(dashboard)/app/company/teams/[id]/page.tsx")
const deptDetail = read(
  "../../app/(dashboard)/app/company/departments/[id]/page.tsx"
)
const syncDetail = read(
  "../../app/(dashboard)/app/company/sync-history/[id]/page.tsx"
)
const recruitDetail = read(
  "../../app/(dashboard)/app/recruitment/job-openings/[jobOpeningId]/page.tsx"
)
const responseDetail = read(
  "../../app/(dashboard)/app/assessments/responses/[id]/page.tsx"
)
const deptTable = read(
  "../../features/organization/departments/components/department-table.tsx"
)
const senioritySection = read(
  "../../features/organization/position-seniorities/components/position-seniorities-section.tsx"
)
const wizardFooter = read("../product/wizard/product-wizard-footer.tsx")
const employeeCreateDialog = read(
  "../../features/people/components/employee-create-dialog.tsx"
)
const employeeEditDialog = read(
  "../../features/people/components/employee-edit-dialog.tsx"
)
const positionsList = read(
  "../../app/(dashboard)/app/company/positions/page.tsx"
)
const teamsList = read("../../app/(dashboard)/app/company/teams/page.tsx")
const seniorityList = read(
  "../../app/(dashboard)/app/company/seniority/page.tsx"
)
const syncHistoryList = read(
  "../../app/(dashboard)/app/company/sync-history/page.tsx"
)

const touchedPages = [
  peopleDetail,
  teamDetail,
  deptDetail,
  syncDetail,
  recruitDetail,
  responseDetail,
]

test("EntityBackLink is a semantic anchor with an icon and no router/history", () => {
  assert.match(backLink, /from "next\/link"/)
  assert.match(backLink, /ArrowLeft/)
  assert.doesNotMatch(backLink, /useRouter|router\.back|history/)
})

test("every added back link and touched page is deterministic — never router.back()", () => {
  for (const source of [backLink, ...touchedPages]) {
    assert.doesNotMatch(source, /router\.back\(\)/)
  }
})

const cases: Array<[string, string, string, string]> = [
  ["people", peopleDetail, "/app/people", "Voltar para pessoas"],
  ["teams", teamDetail, "/app/company/teams", "Voltar para times"],
  ["departments", deptDetail, "/app/company", "Voltar para empresa"],
  [
    "sync-history",
    syncDetail,
    "/app/company/sync-history",
    "Voltar para histórico de sincronização",
  ],
  [
    "recruitment",
    recruitDetail,
    "/app/recruitment",
    "Voltar para recrutamento",
  ],
  [
    "assessment responses",
    responseDetail,
    "/app/assessments",
    "Voltar para avaliações",
  ],
]

for (const [name, source, href, label] of cases) {
  test(`${name} detail has a deterministic EntityBackLink to ${href}`, () => {
    assert.match(source, /EntityBackLink/)
    assert.match(source, /from "@\/components\/shared\/entity-back-link"/)
    assert.ok(source.includes(`href="${href}"`), `href ${href}`)
    assert.ok(source.includes(`label="${label}"`), `label ${label}`)
  })
}

test("the department table exposes a deterministic 'Ver detalhes' entry to the detail route", () => {
  assert.match(deptTable, /Ver detalhes/)
  assert.match(
    deptTable,
    /href=\{`\/app\/company\/departments\/\$\{department\.id\}`\}/
  )
})

test("the dialog body is a bounded flex column that scrolls internally", () => {
  assert.match(dialog, /flex min-h-0 flex-1 flex-col overflow-hidden/)
  // The single child (form/wizard) fills the bounded body.
  assert.match(dialog, /\[&>\*\]:min-h-0/)
  assert.match(dialog, /\[&>\*\]:flex-1/)
})


test("the seniority section explains the catalog origin without changing behavior", () => {
  assert.match(senioritySection, /Senioridades aplicáveis a este cargo/)
  assert.match(senioritySection, /catálogo de senioridades da empresa/)
  // Global-catalog vs applicable-to-cargo architecture preserved (still reads
  // applicable/available; no auto-apply).
  assert.match(senioritySection, /applicable/)
  assert.match(senioritySection, /available/)
})

test("no Supabase/DB access was introduced by the navigation components", () => {
  for (const source of [backLink, dialog, wizard, deptTable]) {
    assert.doesNotMatch(source, /createServerDatabase|\.rpc\(|service_role/)
  }
})

test("the wizard footer is a shrink-0 region outside the scrollable content", () => {
  assert.match(wizardFooter, /shrink-0/)
  // Content region (in the wizard forms) owns overflow-y-auto, not the footer.
  assert.doesNotMatch(wizardFooter, /overflow-y-auto/)
})

test("the wizard fills its parent via flex (no full-viewport vh/h-full cap)", () => {
  assert.match(wizard, /flex-1/)
  assert.match(wizard, /min-h-0/)
  assert.doesNotMatch(wizard, /max-h-\[85vh\]/)
  assert.doesNotMatch(wizard, /h-full/)
})

test("the dialog forces its child to a filling flex column so content scrolls", () => {
  assert.match(dialog, /\[&>\*\]:flex\b/)
  assert.match(dialog, /\[&>\*\]:flex-col/)
  assert.match(dialog, /\[&>\*\]:flex-1/)
  assert.match(dialog, /\[&>\*\]:min-h-0/)
})

test("create/edit person dialogs disable outside-click dismissal (no data loss)", () => {
  assert.match(dialog, /dismissible/)
  assert.match(employeeCreateDialog, /dismissible=\{false\}/)
  assert.match(employeeEditDialog, /dismissible=\{false\}/)
})

test("Company list pages return deterministically to the Company hub", () => {
  for (const [name, source] of [
    ["positions", positionsList],
    ["sync-history", syncHistoryList],
  ] as const) {
    assert.match(source, /EntityBackLink/, name)
    assert.ok(source.includes('href="/app/company"'), `${name} href`)
    assert.ok(
      source.includes('label="Voltar para empresa"'),
      `${name} label`
    )
  }
})

test("Seniority page returns to the Company hub by default, and to a position with valid origin context", () => {
  assert.match(seniorityList, /EntityBackLink/)
  // Default (no/invalid origin) still returns to the Company hub.
  assert.ok(seniorityList.includes('href: "/app/company"'), "default href")
  assert.ok(
    seniorityList.includes('label: "Voltar para empresa"'),
    "default label"
  )
  // Contextual origin is a UUID-validated position id → internal position route.
  assert.match(seniorityList, /z\s*\.string\(\)\s*\.uuid\(\)\s*\.safeParse/)
  assert.match(seniorityList, /\/app\/company\/positions\/\$\{positionId\.data\}/)
  assert.match(seniorityList, /Voltar para o cargo/)
})

test("Teams page returns to the Company hub by default, and to a person profile with valid origin context", () => {
  assert.match(teamsList, /EntityBackLink/)
  // Default (no/invalid origin) still returns to the Company hub.
  assert.ok(teamsList.includes('href: "/app/company"'), "default href")
  assert.ok(
    teamsList.includes('label: "Voltar para empresa"'),
    "default label"
  )
  // Contextual origin is a UUID-validated person id → internal profile route.
  assert.match(teamsList, /z\s*\.string\(\)\s*\.uuid\(\)\s*\.safeParse/)
  assert.match(teamsList, /\/app\/people\/\$\{personId\.data\}/)
  assert.match(teamsList, /Voltar para o perfil/)
})
