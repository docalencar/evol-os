import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"

const sourcePath = new URL(
  "../decision-feed/server/create-executive-decision-feed.ts",
  import.meta.url,
)
const source = readFileSync(sourcePath, "utf8")
const ast = ts.createSourceFile(
  sourcePath.pathname,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)

const imports = ast.statements
  .filter(ts.isImportDeclaration)
  .map((statement) => {
    const specifier = statement.moduleSpecifier
    return ts.isStringLiteral(specifier) ? specifier.text : ""
  })

test("Executive Decision Feed uses the trusted dashboard read boundary", () => {
  assert.ok(imports.includes("@/features/dashboard-read"))
  assert.equal(
    imports.some((specifier) =>
      specifier.includes("people/repositories")
      || specifier.includes("people/queries/get-employees")
      || specifier === "@/features/people"
    ),
    false,
  )
})

test("Executive route wires the independent server-side access guard", () => {
  const route = readFileSync(
    new URL(
      "../../../app/(dashboard)/app/executive/page.tsx",
      import.meta.url,
    ),
    "utf8",
  )
  const routeAst = ts.createSourceFile(
    "executive-page.tsx",
    route,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const calls: string[] = []
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
    ) {
      calls.push(node.expression.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(routeAst)

  assert.ok(calls.includes("getCurrentCompanyContext"))
  assert.ok(calls.includes("requireExecutiveAccess"))
  assert.ok(calls.includes("getExecutiveHome"))
})
