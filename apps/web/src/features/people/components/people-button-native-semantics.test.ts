import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const peoplePageSource = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(dashboard)/app/people/page.tsx"
  ),
  "utf8"
)

const employeeTableSource = readFileSync(
  resolve(
    process.cwd(),
    "src/features/people/components/employee-table.tsx"
  ),
  "utf8"
)

test("People navigation buttons declare non-button native semantics", () => {
  assert.match(
    peoplePageSource,
    /<Button[\s\S]*?nativeButton=\{false\}[\s\S]*?render=\{[\s\S]*?<Link href="\/app\/people\/import" \/>/
  )

  assert.match(
    employeeTableSource,
    /<Button[\s\S]*?nativeButton=\{false\}[\s\S]*?render=\{[\s\S]*?<Link[\s\S]*?href=\{`\/app\/people\/\$\{employee\.id\}`\}/
  )
})
