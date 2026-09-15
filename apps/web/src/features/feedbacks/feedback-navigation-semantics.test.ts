import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname)
const starter = readFileSync(resolve(root, "components/assessment-response-feedback-starter.tsx"), "utf8")
const table = readFileSync(resolve(root, "components/feedback-thread-table.tsx"), "utf8")
const spec = readFileSync(resolve(root, "../../../e2e/specs/14-assessment-feedback-lifecycle.spec.ts"), "utf8")

function navigationAffordance(source: string, label: string): string {
  const labelAt = source.indexOf(`>${label}<`)
  const actualLabelAt = labelAt === -1 ? source.search(new RegExp(`>\\s+${label}\\s+<`)) : labelAt
  assert.notEqual(actualLabelAt, -1, `${label}: label absent`)
  const openingAt = source.lastIndexOf("<Link", actualLabelAt)
  assert.notEqual(openingAt, -1, `${label}: Link absent`)
  const opening = source.slice(openingAt, actualLabelAt)
  assert.ok(!opening.includes("</Link>"), `${label}: label is not inside Link`)
  return opening
}

function assertLinkSemantics(source: string, label: string, id: string, variants: RegExp): void {
  const opening = navigationAffordance(source, label)
  assert.ok(opening.includes('href={`/app/feedbacks/${' + id + '}`}'))
  assert.match(opening, variants)
  assert.doesNotMatch(opening, /nativeButton|render=|role=/)
  assert.match(source, new RegExp(`>\\s+${label}\\s+<\\/Link>`))
}

test("formal response bridge and inbox action are real styled navigation links", () => {
  assertLinkSemantics(starter, "Abrir conversa de feedback", "link.threadId", /buttonVariants\(\)/)
  assertLinkSemantics(table, "Abrir conversa", "thread.id", /buttonVariants\(\{ variant: "outline", size: "sm" \}\)/)
  assert.match(spec, /getByRole\("link", \{ name: "Abrir conversa de feedback" \}\)/)
  assert.match(spec, /getByRole\("link", \{ name: "Abrir conversa" \}\)/)
  assert.doesNotMatch(spec, /getByRole\("button", \{ name: "Abrir conversa(?: de feedback)?" \}\)/)
})

test("navigation guard rejects the former Button-wrapped-Link defect in memory", () => {
  const brokenStarter = starter.replace(
    /<Link\s+href=\{`\/app\/feedbacks\/\$\{link\.threadId\}`\}\s+className=\{buttonVariants\(\)\}\s*>\s+Abrir conversa de feedback\s+<\/Link>/,
    '<Button nativeButton={false} render={<Link href={`/app/feedbacks/${link.threadId}`} />}>\n          Abrir conversa de feedback\n        </Button>',
  )
  const brokenTable = table.replace(
    /<Link\s+href=\{`\/app\/feedbacks\/\$\{thread\.id\}`\}\s+className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}\s*>\s+Abrir conversa\s+<\/Link>/,
    '<Button nativeButton={false} render={<Link href={`/app/feedbacks/${thread.id}`} />}>\n              Abrir conversa\n            </Button>',
  )
  assert.notEqual(brokenStarter, starter, "starter mutation must apply")
  assert.notEqual(brokenTable, table, "table mutation must apply")
  assert.throws(() => assertLinkSemantics(brokenStarter, "Abrir conversa de feedback", "link.threadId", /buttonVariants\(\)/))
  assert.throws(() => assertLinkSemantics(brokenTable, "Abrir conversa", "thread.id", /buttonVariants\(\)/))
})
