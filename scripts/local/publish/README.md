# Publication manifests

`scripts/local/publish-gate.sh <manifest> [--dry-run]` performs the repeated part
of publishing a candidate branch. What varies per slice lives in a manifest; what
is identical lives in the runner.

## Manifest format

Plain `key = value` lines. Blank lines and `#` comments are ignored. **The file is
parsed, never sourced** — it is data, not code. An unknown key is a hard failure,
because a mistyped guard would otherwise be an invisible loss of governance.

| Key | Required | Meaning |
| --- | --- | --- |
| `branch` | yes | branch that must be checked out |
| `base` | yes | canonical main the candidate was cut from; `origin/main` must still equal it |
| `candidate` | yes | the exact SHA to publish; must be `HEAD` |
| `commits` | yes | the full ordered commit sequence over base, space-separated |
| `files` | yes | the exact changed-file set over base, space-separated |
| `pr_title` | yes | PR title |
| `pr_body` | yes | path to a file holding the PR body |
| `ancestors` | no | extra SHAs that must remain in ancestry — a reconciliation merge, a prior candidate that must not have been squashed away, a dependency slice |
| `require_check` | no | a named CI check that must report `SUCCESS`. Use when local evidence was unavailable — a *skipped* job is not evidence |
| `guard` | no, repeatable | path to a slice-specific guard script |

## Guards

Anything needing real logic is a guard, not a runner feature. A guard is a script;
**exit 0 is the only pass**. It receives `PUBLISH_BASE`, `PUBLISH_CANDIDATE` and
`PUBLISH_BRANCH` so it never re-derives identities.

Guards are where slice-specific business rules belong — a migration hash that must
match, a document that must not claim an artifact exists, a local gate attestation.
Keep them next to the slice they serve.

## Example

```
branch        = docs/my-slice
base          = 1111111111111111111111111111111111111111
candidate     = 2222222222222222222222222222222222222222
commits       = 2222222222222222222222222222222222222222
files         = docs/Execution/MY-CONTRACT.md docs/NEXT_STEPS.md
pr_title      = docs(execution): freeze my contract
pr_body       = /tmp/my-pr-body.md
ancestors     = 3333333333333333333333333333333333333333
require_check = build
guard         = scripts/local/publish/guards/no-false-claims.sh
```

## What the runner always enforces

Branch, candidate and base identity; merge-base; exact commit sequence; exact file
scope; no renames; `diff --check`; the repo's protected untracked files, evidence
directory and stash; the `docs/Execution` casing authority (nothing may enter the
index under the lowercase spelling); push without force and refusal of a divergent
remote; PR state, base, head, file count and commit count; CI on the exact
candidate SHA with `QUEUED`/`IN_PROGRESS` treated as pending rather than failure;
merge commit only, never squash or rebase; both merge parents and full ancestry;
post-main CI when one is emitted; fast-forward-only local sync; and a re-check
that protected state survived the checkout.

It never contacts Review, Production or Legacy.

## Dry run

`--dry-run` performs every verification and stops before the first mutating
command. That is what makes the refusals testable —
`scripts/local/publish-gate.test.mjs` builds throwaway repositories and asserts
each invariant fails closed, without any remote.
