# Publication manifests

`scripts/local/publish-gate.sh <manifest> [--dry-run | --stop-after-pr]` performs
the repeated part of publishing a candidate branch. What varies per slice lives
in a manifest; what is identical lives in the runner.

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
| `pr_body` | yes | path to a file holding the PR body, **inside the repository** (relative paths resolve from the repo root). An executor-local path such as `/tmp/body.md` is refused: it exists only on the machine that wrote it, and a publication resumed elsewhere would fail after the push |
| `ancestors` | no | extra SHAs that must remain in ancestry — a reconciliation merge, a prior candidate that must not have been squashed away, a dependency slice |
| `require_check` | no | a named CI check that must report `SUCCESS`. Use when local evidence was unavailable — a *skipped* job is not evidence. The name is the **check-run** name, which for GitHub Actions is the **job id** (`jobs.<id>` in the workflow), not the workflow name and not a step. This repo's `.github/workflows/ci.yml` defines one job, `web`, whose steps run lint and build. Matching is exact: an unrelated green job never satisfies a named required check |
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
pr_body       = scripts/local/publish/bodies/my-slice.md
ancestors     = 3333333333333333333333333333333333333333
require_check = web
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
publication command. It still executes `git fetch origin`, which can update local
remote-tracking references, but it never pushes, opens a PR or merges. That is
what makes the refusals testable —
`scripts/local/publish-gate.test.mjs` builds throwaway repositories and asserts
each invariant fails closed, without any remote.

## Publish branch and PR without merge

`--stop-after-pr` is an explicit, opt-in publication boundary. It runs the same
preflight and guards as the default mode, pushes without force, creates or reuses
the declared PR, validates its identity and scope, and reconciles the live remote
branch and `main`. It accepts only a PR whose `isCrossRepository` metadata is the
boolean value `false`; missing, null or differently typed provenance fails closed.
It then exits before CI evaluation and before every merge, checkout or local-main
synchronization path.

`--stop-after-pr` and `--dry-run` are mutually exclusive. Exit code zero in this
mode means only that the branch and PR were published and reconciled. Its output
is deliberately distinct:

```
PUBLICATION=PR_OPEN
MERGE=NOT_EXECUTED
CI_STATUS=NOT_EVALUATED
```

It does not mean CI passed, merge was authorized, or publication was closed. A
later, separately authorized default invocation reuses the remote branch and PR,
then evaluates CI and follows the existing merge flow.

Remote reconciliation is a point-in-time state verification, without a guarantee
of an atomic snapshot across the separate Git and GitHub queries.

A remote failure can leave a correctly pushed branch without a PR, or an open PR
whose final reconciliation failed. The gate reports that state and fails closed;
it never deletes remote state as an automatic rollback. Re-running the same mode
is safe when identities still match because the push is non-forced and an
existing PR is reused rather than duplicated.
