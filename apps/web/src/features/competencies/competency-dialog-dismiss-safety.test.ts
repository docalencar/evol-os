import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const dialogs = {
  create: read("./components/competency-create-dialog.tsx"),
  edit: read("./components/competency-edit-dialog.tsx"),
}

test("catalog Competency create/edit forms reject accidental dismissal", () => {
  for (const [name, source] of Object.entries(dialogs)) {
    assert.match(source, /<EntityDialog/, `${name} uses EntityDialog`)
    assert.match(source, /dismissible=\{false\}/, `${name} is hardened`)
  }
})

test("catalog Competency create/edit keep explicit success and open-state close paths", () => {
  for (const [name, source] of Object.entries(dialogs)) {
    assert.match(source, /onOpenChange=\{setOpen\}/, `${name} keeps explicit X close`)
    assert.match(
      source,
      /onSuccess=\{\(\) => setOpen\(false\)\}/,
      `${name} closes after successful submit or form cancel`
    )
    assert.match(source, /<CompetencyForm/, `${name} keeps the catalog form`)
  }
})

test("dismiss hardening introduces no persistence or redirect behavior", () => {
  for (const [name, source] of Object.entries(dialogs)) {
    assert.doesNotMatch(source, /\.rpc\(|\.from\(|redirect\(|router\./, name)
    assert.doesNotMatch(source, /returnTo|redirectTo|externalUrl/, name)
  }
})
