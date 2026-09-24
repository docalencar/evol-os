## The failure

Publishing this branch reached step 4/9 with CI green and stopped:

```
SUCCESS web
STOP: required check 'build' was not reported for this commit
```

PR #169 is open and mergeable, workflow run #415 is COMPLETED / SUCCESS, and
`main` is unchanged. **The gate was right to block.**

## Root cause

**Stale manifest contract.** `.github/workflows/ci.yml` defines exactly one job,
`web`, whose steps run `npm run lint` and `npm run build`. A GitHub Actions
check-run is named after the **job id**, so the only check this repo ever
produces is `web`. `build` is an npm *step* — it has never been a check-run name.
The manifests asked for evidence that cannot exist, and the gate correctly
refused to invent it.

**A latent matching defect, found while inspecting.** The selection was
`grep -iE "$m_require_check"` over the whole `"<STATE>\tNAME"` line. That is a
case-insensitive *regex* over *both columns*, so a required check could have been
satisfied by an unrelated green job whose name merely contained the string, by a
regex metacharacter, or by the STATE column itself — `require_check = SUCCESS`
would have matched every green line. That is precisely the "unrelated green
workflow satisfies a named required check" hazard, and it was one manifest typo
away from passing something it should have blocked.

## Correction

Discovery was already correct — `gh pr checks` reports **check-runs**, which is
why `SUCCESS web` was seen at all even though the commit-status endpoint returns
nothing. Only the *selection* changed:

- the required check is selected by **exact match on the name column**, in
  `scripts/local/publish-check-state.sh`;
- absent evidence exits non-zero, so the gate blocks and now lists the names that
  *were* reported;
- `QUEUED` / `IN_PROGRESS` / `PENDING` remain pending, `FAILURE` / `CANCELLED` /
  `TIMED_OUT` remain blocking, `SKIPPED` is still not evidence, and only
  `SUCCESS` advances;
- the candidate-SHA binding is untouched: the PR head is re-verified against the
  candidate immediately before the merge.

The selector is a separate stdin→stdout filter because step 4/9 cannot run
without `gh` and a live PR — the rule could not be tested where it was written.

Manifest metadata corrected narrowly: `require_check = build` → `web`.

## Regression coverage

37/37 pass, eight new: SUCCESS advances; queued/in-progress resolve as pending;
failure/cancelled/timed-out resolve as themselves; an unrelated green check never
satisfies a missing one — including substring, regex and state-column attempts;
Actions check-run evidence resolves with no commit statuses; evidence stays bound
to the candidate SHA; the selection is exact rather than a line regex; and the
manifests' `require_check` must name a job that actually exists in `ci.yml`.

Verified red against the old matcher, green against the correction.

## Scope

Tooling and publication metadata only. TOOL-PUB2 (`dd17723`) and TOOL-PUB3
(`f7c22ff`) are carried unchanged as ancestors and pinned in the manifest.
