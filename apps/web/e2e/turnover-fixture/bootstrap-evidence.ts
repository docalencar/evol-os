import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"

import type { BootstrapEvidence, BootstrapEvidenceStore } from "./bootstrap-runner"

const FORBIDDEN = /password|token|service.?role|anon.?key|db.?password|secret/i

function serialize(evidence: BootstrapEvidence): string {
  const value = JSON.stringify(evidence, null, 2)
  if (FORBIDDEN.test(value)) throw new Error("TURNOVER_BOOTSTRAP_EVIDENCE_SECRET_REJECTED")
  return value
}

export function fileBootstrapEvidenceStore(path: string): BootstrapEvidenceStore {
  const store: BootstrapEvidenceStore = {
    create(evidence: BootstrapEvidence) {
      writeFileSync(path, serialize(evidence), { encoding: "utf8", flag: "wx", mode: 0o600 })
    },
    replace(evidence: BootstrapEvidence) {
      if (!existsSync(path)) throw new Error("TURNOVER_BOOTSTRAP_EVIDENCE_MISSING")
      JSON.parse(readFileSync(path, "utf8"))
      const temporary = `${path}.tmp`
      writeFileSync(temporary, serialize(evidence), { encoding: "utf8", flag: "wx", mode: 0o600 })
      renameSync(temporary, path)
    },
  }
  return Object.freeze(store)
}
