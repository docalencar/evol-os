/** Static H4 guard: no hosted browser or Review access. */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname)
const spec = readFileSync(resolve(root, "specs/05-organization-structure.spec.ts"), "utf8")

const creationStart = 'test("a Position is created through the wizard and linked to that Department"'
const creationEnd = 'test("a Team is created once its department options have finished loading"'

function positionCreationBody(source: string): string {
  const start = source.indexOf(creationStart)
  const end = source.indexOf(creationEnd, start)
  assert.ok(start >= 0 && end > start, "Position creation test boundaries must remain explicit")
  return source.slice(start, end).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")
}

function assertDurablePositionProof(source: string): void {
  const body = positionCreationBody(source)
  const stages = [
    'page.getByRole("button", { name: "Criar cargo" }).click()',
    'page.getByText("Cargo criado com sucesso.", { exact: true })).toBeVisible()',
    'page.getByRole("dialog", { name: "Novo cargo" })).toBeHidden()',
    'page.reload()',
    'page.getByRole("table").getByRole("link", { name: position, exact: true })).toBeVisible(',
  ]
  let previous = -1
  for (const stage of stages) {
    const current = body.indexOf(stage)
    assert.ok(current > previous, `Position proof stage absent or out of order: ${stage}`)
    previous = current
  }
  assert.doesNotMatch(body, /getByText\(position\s*,\s*\{\s*exact:\s*true\s*\}\)/)
  assert.match(body, /getByRole\("heading", \{ level: 1, name: "Cargos" \}\)\)\.toBeVisible\(\)/)
}

test("Position submit requires product success, dialog completion and server-backed list readback", () => {
  assertDurablePositionProof(spec)
})

test("guard rejects four old/partial proof sequences in memory", () => {
  const replacements: ReadonlyArray<readonly [string, string, string]> = [
    ["success signal removed", 'page.getByText("Cargo criado com sucesso.", { exact: true })).toBeVisible()', 'page.getByText("Cargo criado com sucesso.", { exact: true })).toBeHidden()'],
    ["completion assertion removed", 'page.getByRole("dialog", { name: "Novo cargo" })).toBeHidden()', 'page.getByRole("dialog", { name: "Novo cargo" })).toBeVisible()'],
    ["server boundary removed", 'await page.reload()', 'await Promise.resolve()'],
    ["review text accepted as persistence", 'page.getByRole("table").getByRole("link", { name: position, exact: true })).toBeVisible(', 'page.getByText(position, { exact: true }).first()).toBeVisible('],
  ]

  for (const [description, before, after] of replacements) {
    const mutated = spec.replace(before, after)
    assert.notEqual(mutated, spec, `${description}: mutation must apply`)
    assert.throws(() => assertDurablePositionProof(mutated), `${description}: guard must turn red`)
  }
})
