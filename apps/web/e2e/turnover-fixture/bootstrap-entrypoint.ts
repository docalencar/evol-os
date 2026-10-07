import { fileBootstrapEvidenceStore } from "./bootstrap-evidence"
import { runTurnoverFixtureBootstrap } from "./bootstrap-runner"
import { canonicalTurnoverBootstrapAdapter, type CanonicalTurnoverTransport } from "./canonical-adapter"

export async function executeGovernedTurnoverBootstrap(input: Readonly<{
  journalPath: string
  evidencePath: string
  transport: CanonicalTurnoverTransport
  now?: () => string
}>) {
  return runTurnoverFixtureBootstrap({
    journalPath: input.journalPath,
    evidence: fileBootstrapEvidenceStore(input.evidencePath),
    adapter: canonicalTurnoverBootstrapAdapter(input.transport),
    now: input.now ?? (() => new Date().toISOString()),
  })
}
