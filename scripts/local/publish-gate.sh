#!/usr/bin/env bash
#
# Publication gate — the repeated part of publishing a candidate branch.
#
#   bash scripts/local/publish-gate.sh <manifest> [--dry-run]
#
# Run it as its own process. Never source it, never eval it: a nonzero exit is a
# normal result and must not be able to close an interactive shell.
#
# WHY THIS EXISTS
#
# Five consecutive slices were published by hand-written wrappers totalling ~1700
# lines, of which the same nine steps were roughly 80%: identity, scope, protected
# state, push, PR identity, CI on the exact SHA, merge commit, parent and ancestry
# verification, post-main CI, fast-forward sync. Regenerating that per slice put
# the logic outside review and invited drift. It lives here instead.
#
# WHAT STAYS OUT
#
# Slice-specific business rules are NOT embedded here. They arrive as declarative
# manifest inputs, and anything that needs real logic arrives as a `guard` script
# the runner executes. This is a publication gate, not a workflow framework: it
# does one job and it does not grow features for hypothetical slices.
#
# The manifest is PARSED, never sourced. Sourcing a config file would make it
# executable code, which is exactly what the method forbids.
#
# It never contacts Review, Production or Legacy, and never runs a hosted browser.

set -uo pipefail

say()  { printf '%s\n' "$*"; }
stop() { say ""; say "STOP: $*"; say "PUBLICATION=BLOCKED"; exit 1; }

# ---------------------------------------------------------------------------
# Protected state. Repo-wide and identical across slices, so it belongs to the
# runner rather than to every manifest. `docs/execution/` is the lowercase
# spelling that holds protected untracked files on a case-insensitive filesystem;
# the Git index spells the tracked directory `docs/Execution/` and that is the
# casing authority.
# ---------------------------------------------------------------------------
PROTECTED_FILES=(
  "apps/web/.env.local.smoke-backup"
  "docs/execution/MVP-CLOSURE-PR-I-MUTATION-BOUNDARY-AUDIT.md"
  "docs/execution/MVP-PR1-PHASE6-INVITATION-ACCEPTANCE-IMPLEMENTATION-PLAN.md"
  "scripts/review/promote-0126-retention-pressure.sh"
  "scripts/review/verify-0126-retention-pressure-post.sh"
)
PROTECTED_EVIDENCE_DIR=".e5r1e-evidence"
PROTECTED_STASH="52d5693ef1f6a156913d3cafa952894ad38485ea"

MANIFEST=""; DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -*)        stop "unknown option: $arg" ;;
    *)         [ -z "$MANIFEST" ] && MANIFEST="$arg" || stop "unexpected argument: $arg" ;;
  esac
done
[ -n "$MANIFEST" ] || stop "usage: publish-gate.sh <manifest> [--dry-run]"
[ -f "$MANIFEST" ] || stop "manifest not found: $MANIFEST"

# ---------------------------------------------------------------------------
# Parse the manifest. Known keys only: a typo must fail loudly rather than be
# silently ignored, because a dropped guard is an invisible loss of governance.
# ---------------------------------------------------------------------------
m_branch=""; m_base=""; m_candidate=""; m_commits=""; m_files=""
m_pr_title=""; m_pr_body=""; m_require_check=""; m_ancestors=""
# bash 3.2 (what macOS ships) treats an EMPTY array as UNSET, so under `set -u`
# both "${m_guards[@]}" and ${#m_guards[@]} abort when no guard is declared. The
# count is therefore tracked as a plain integer, and the array is only ever
# expanded through the ${arr[@]+"${arr[@]}"} form, which is safe on 3.2 and 5.x
# alike. Zero guards is a valid manifest; it must run zero guard commands, not
# fail, and must not require a no-op guard to paper over it.
m_guards=()
m_guard_count=0

lineno=0
while IFS= read -r line || [ -n "$line" ]; do
  lineno=$((lineno + 1))
  line="${line%%#*}"
  line="$(printf '%s' "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$line" ] && continue
  case "$line" in *=*) : ;; *) stop "manifest line $lineno is not key = value: $line" ;; esac
  key="$(printf '%s' "${line%%=*}" | sed 's/[[:space:]]*$//')"
  val="$(printf '%s' "${line#*=}" | sed 's/^[[:space:]]*//')"
  case "$key" in
    branch)        m_branch="$val" ;;
    base)          m_base="$val" ;;
    candidate)     m_candidate="$val" ;;
    commits)       m_commits="$val" ;;
    files)         m_files="$val" ;;
    ancestors)     m_ancestors="$val" ;;
    pr_title)      m_pr_title="$val" ;;
    pr_body)       m_pr_body="$val" ;;
    require_check) m_require_check="$val" ;;
    guard)         [ -n "$val" ] || stop "manifest line $lineno: guard path is empty"
                   m_guards+=("$val"); m_guard_count=$((m_guard_count + 1)) ;;
    *)             stop "unknown manifest key '$key' on line $lineno" ;;
  esac
done < "$MANIFEST"

# Indirect expansion, not eval: this runner never turns data into code.
for req in branch base candidate commits files pr_title pr_body; do
  varname="m_$req"
  [ -n "${!varname}" ] || stop "manifest is missing required key: $req"
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || stop "not inside a git repository"
cd "$REPO_ROOT" || stop "cannot enter repository root"
say "[publish] repo: $REPO_ROOT"
say "[publish] manifest: $MANIFEST"
[ "$DRY_RUN" = 1 ] && say "[publish] DRY RUN — verification only, nothing will be pushed, opened or merged"

command -v git >/dev/null 2>&1 || stop "'git' not found"
if [ "$DRY_RUN" = 0 ]; then
  command -v gh >/dev/null 2>&1 || stop "'gh' not found"
  gh auth status >/dev/null 2>&1 || stop "gh is not authenticated. Run: gh auth login"
fi

# ---------------------------------------------------------------------------
# 1. identity, ancestry, scope, protected state
# ---------------------------------------------------------------------------
say "[publish] 1/9 pre-publication verification ..."
git fetch origin >/dev/null 2>&1 || stop "git fetch failed"

[ "$(git rev-parse --abbrev-ref HEAD)" = "$m_branch" ] || stop "not on $m_branch"
[ "$(git rev-parse HEAD)" = "$m_candidate" ]           || stop "HEAD is not the declared candidate $m_candidate"
[ "$(git rev-parse origin/main)" = "$m_base" ] \
  || stop "origin/main is $(git rev-parse origin/main), manifest declares $m_base — reconcile separately; do NOT rebase here"
[ "$(git merge-base HEAD origin/main)" = "$m_base" ]   || stop "merge-base is not the declared base"
[ -z "$(git status --porcelain=v1 | grep -v '^??')" ]  || stop "tracked worktree is not clean"

ACTUAL_COMMITS="$(git log --reverse --format='%H' origin/main..HEAD | tr '\n' ' ')"
EXPECT_COMMITS="$(printf '%s ' $m_commits)"
[ "$ACTUAL_COMMITS" = "$EXPECT_COMMITS" ] \
  || stop "commit sequence mismatch — expected: ${EXPECT_COMMITS}actual: $ACTUAL_COMMITS"

# Extra ancestry the slice cares about (a reconciliation merge, a prior candidate
# that must not have been squashed away, a dependency slice).
for sha in $m_ancestors; do
  git merge-base --is-ancestor "$sha" HEAD || stop "declared ancestor $sha is not in the candidate's ancestry"
done

ACTUAL_FILES="$(git diff --name-only "$m_base..HEAD" | sort | tr '\n' ' ')"
EXPECT_FILES="$(printf '%s\n' $m_files | sort | tr '\n' ' ')"
[ "$ACTUAL_FILES" = "$EXPECT_FILES" ] \
  || stop "scope mismatch — expected: ${EXPECT_FILES}actual: $ACTUAL_FILES"

git diff --name-status "$m_base..HEAD" | grep -q '^R' && stop "a file was renamed or moved"
git diff --check "$m_base..HEAD" || stop "diff --check failed"

# The PR body is a publication input like any other, so it is verified here -
# before the push - and therefore identically in dry-run and in a real run. It
# used to be checked in step 3/9, after the branch had already been pushed, which
# left a remote branch with no PR when the path was wrong.
#
# It must be repository-backed. An executor-local path such as /tmp/body.md is
# valid only on the machine that wrote it, so a publication prepared on one
# machine and resumed on another fails after mutating the remote. A relative path
# resolves against the repository root.
case "$m_pr_body" in
  /*) PR_BODY_ABS="$m_pr_body" ;;
  *)  PR_BODY_ABS="$REPO_ROOT/$m_pr_body" ;;
esac
case "$PR_BODY_ABS" in
  "$REPO_ROOT"/*) : ;;
  *) stop "pr_body must live inside the repository so it survives a change of machine: $m_pr_body" ;;
esac
[ -f "$PR_BODY_ABS" ] || stop "pr_body file not found: $m_pr_body"
m_pr_body="$PR_BODY_ABS"

PROT_OK=1
for f in "${PROTECTED_FILES[@]}"; do
  [ -f "$f" ] || { say "            MISSING protected file: $f"; PROT_OK=0; }
done
[ -d "$PROTECTED_EVIDENCE_DIR" ] || { say "            MISSING $PROTECTED_EVIDENCE_DIR"; PROT_OK=0; }
git cat-file -t "$PROTECTED_STASH" >/dev/null 2>&1 || { say "            protected stash object missing"; PROT_OK=0; }
[ "$(git ls-files | grep -ciE 'MVP-CLOSURE-PR-I|MVP-PR1-PHASE6-INVITATION')" = "0" ] \
  || { say "            a protected file became tracked"; PROT_OK=0; }
# Casing authority: nothing may enter the index under the lowercase spelling.
[ "$(git ls-files docs/execution/ | wc -l | tr -d ' ')" = "0" ] \
  || { say "            tracked entries exist under docs/execution/"; PROT_OK=0; }
[ "$(git diff --name-only "$m_base..HEAD" | grep -c '^docs/execution/')" = "0" ] \
  || { say "            candidate adds a lowercase docs/execution/ path"; PROT_OK=0; }
[ "$PROT_OK" = "1" ] || stop "protected state check failed"

# Slice-specific guards. Each is a script; exit 0 is the only pass. They receive
# the identities so they never have to re-derive them.
for g in ${m_guards[@]+"${m_guards[@]}"}; do
  [ -f "$g" ] || stop "guard script not found: $g"
  say "[publish]     guard: $g"
  PUBLISH_BASE="$m_base" PUBLISH_CANDIDATE="$m_candidate" PUBLISH_BRANCH="$m_branch" \
    bash "$g" || stop "guard failed: $g"
done

say "[publish]     identity, ancestry, scope, protected state and $m_guard_count guard(s) PASS"

if [ "$DRY_RUN" = 1 ]; then
  say ""
  say "DRY RUN complete — all verification passed."
  say "  would push   : $m_branch -> origin"
  say "  would open   : PR '$m_pr_title' (base main, head $m_candidate)"
  say "  would require: $(( $(printf '%s\n' $m_files | wc -l | tr -d ' ') )) file(s), $(printf '%s\n' $m_commits | wc -w) commit(s)${m_require_check:+, check '$m_require_check' SUCCESS}"
  say "  would merge  : merge commit only"
  say "PUBLICATION=DRY_RUN_OK"
  exit 0
fi

# ---------------------------------------------------------------------------
# 2. push — normal, never forced
# ---------------------------------------------------------------------------
say "[publish] 2/9 push ..."
REMOTE_BEFORE="$(git ls-remote --heads origin "$m_branch" | cut -f1)"
if [ -n "$REMOTE_BEFORE" ] && [ "$REMOTE_BEFORE" != "$m_candidate" ]; then
  stop "remote branch exists at $REMOTE_BEFORE — classify the divergence, do NOT force push"
fi
git push origin "$m_branch" || stop "push failed"
[ "$(git ls-remote --heads origin "$m_branch" | cut -f1)" = "$m_candidate" ] || stop "remote head != candidate"

# ---------------------------------------------------------------------------
# 3. pull request
# ---------------------------------------------------------------------------
say "[publish] 3/9 pull request ..."
if gh pr view "$m_branch" --json number >/dev/null 2>&1; then
  say "[publish]     a PR already exists for this branch; reusing it"
else
  gh pr create --base main --head "$m_branch" --title "$m_pr_title" --body-file "$m_pr_body" \
    || stop "gh pr create failed"
fi
PR="$(gh pr view "$m_branch" --json number,url,state,isDraft,baseRefName,headRefOid \
      --jq '[.number,.url,.state,.isDraft,.baseRefName,.headRefOid]|@tsv')"
PR_NUM="$(printf '%s' "$PR" | cut -f1)"; PR_URL="$(printf '%s' "$PR" | cut -f2)"
say "[publish]     PR #$PR_NUM  $PR_URL"
[ "$(printf '%s' "$PR" | cut -f3)" = "OPEN" ]           || stop "PR is not OPEN"
[ "$(printf '%s' "$PR" | cut -f4)" = "false" ]          || stop "PR is a draft"
[ "$(printf '%s' "$PR" | cut -f5)" = "main" ]           || stop "PR base is not main"
[ "$(printf '%s' "$PR" | cut -f6)" = "$m_candidate" ]   || stop "PR head != candidate"
[ "$(gh pr view "$PR_NUM" --json files --jq '.files|length')" = "$(printf '%s\n' $m_files | wc -w | tr -d ' ')" ] \
  || stop "PR file count does not match the declared scope"
[ "$(gh pr view "$PR_NUM" --json commits --jq '.commits|length')" = "$(printf '%s\n' $m_commits | wc -w | tr -d ' ')" ] \
  || stop "PR commit count does not match the declared sequence"
[ "$(git rev-parse origin/main)" = "$m_base" ] || stop "origin/main moved after PR creation"

# ---------------------------------------------------------------------------
# 4. CI on the exact candidate. QUEUED/IN_PROGRESS is pending, NOT failure.
# ---------------------------------------------------------------------------
say "[publish] 4/9 waiting for CI on $m_candidate ..."
gh pr checks "$PR_NUM" --watch --interval 20 >/dev/null 2>&1
CI="$(gh pr checks "$PR_NUM" --json name,state --jq '.[]|[.state,.name]|@tsv')"
if [ -n "$CI" ]; then say "$CI" | sed 's/^/            /'; else say "            (no checks reported)"; fi
if printf '%s' "$CI" | grep -qE '^(QUEUED|IN_PROGRESS|PENDING)'; then
  stop "CI still pending — re-run this gate; pending is not failure"
fi
if printf '%s' "$CI" | grep -qvE '^(SUCCESS|SKIPPED|NEUTRAL)'; then
  say ""
  say "CI is not clean. Inspect the failing job and classify before acting — no blind retry:"
  say "  REGRESSION | PRE_EXISTING | STALE_TEST | ENVIRONMENTAL | HARNESS_DEFECT | CONTRACT_CONFLICT"
  say "    gh run view --log-failed"
  say "PR: $PR_URL"
  stop "candidate CI not green"
fi
# A named check the slice depends on — e.g. a build whose local run was
# environmental. SKIPPED is not evidence, so this demands SUCCESS by name.
if [ -n "$m_require_check" ]; then
  STATE="$(printf '%s' "$CI" | grep -iE "$m_require_check" | head -1 | cut -f1)"
  [ -n "$STATE" ] || stop "required check '$m_require_check' was not reported for this commit"
  [ "$STATE" = "SUCCESS" ] || stop "required check '$m_require_check' is '$STATE', not SUCCESS"
  say "[publish]     required check '$m_require_check': SUCCESS"
fi
CI_RUN="$(gh run list --branch "$m_branch" --limit 1 --json databaseId,headSha,conclusion \
          --jq '.[]|[.databaseId,.headSha,.conclusion]|@tsv')"

# ---------------------------------------------------------------------------
# 5. merge — MERGE COMMIT only
# ---------------------------------------------------------------------------
say "[publish] 5/9 merging (merge commit) ..."
[ "$(git rev-parse origin/main)" = "$m_base" ] || stop "origin/main moved — do not merge"
[ "$(gh pr view "$PR_NUM" --json headRefOid --jq .headRefOid)" = "$m_candidate" ] || stop "PR head changed after CI"
if ! gh pr merge "$PR_NUM" --merge; then
  say "If branch protection refuses a merge commit, do NOT squash or rebase around it —"
  say "that rewrites adjudicated commits. Report the protection rule instead."
  stop "gh pr merge failed"
fi

# ---------------------------------------------------------------------------
# 6. merge structure and ancestry
# ---------------------------------------------------------------------------
say "[publish] 6/9 verifying merge ..."
git fetch origin >/dev/null 2>&1
MERGE="$(git rev-parse origin/main)"
P1="$(git rev-parse "$MERGE^1")"; P2="$(git rev-parse "$MERGE^2" 2>/dev/null || echo NONE)"
say "            merge   = $MERGE"
say "            parent1 = $P1"
say "            parent2 = $P2"
[ "$P1" = "$m_base" ]      || stop "parent 1 is not the declared base"
[ "$P2" = "$m_candidate" ] || stop "parent 2 is not the candidate (was it squashed?)"
for sha in $m_commits $m_ancestors "$m_base"; do
  git merge-base --is-ancestor "$sha" "$MERGE" || stop "$sha did not survive the merge"
done

# ---------------------------------------------------------------------------
# 7. post-main CI, if the repository emits one for this change
# ---------------------------------------------------------------------------
say "[publish] 7/9 post-main CI on $MERGE ..."
ROW=""
for _ in $(seq 1 90); do
  ROW="$(gh run list --branch main --event push --limit 10 \
         --json databaseId,headSha,status,conclusion \
         --jq ".[]|select(.headSha==\"$MERGE\")|[.databaseId,.status,.conclusion]|@tsv" | head -1)"
  [ -n "$ROW" ] && [ "$(printf '%s' "$ROW" | cut -f2)" = "completed" ] && break
  sleep 20
done
if [ -z "$ROW" ]; then
  POST="NOT_EMITTED"; say "            no post-main run emitted for this change"
else
  say "            $ROW"
  [ "$(printf '%s' "$ROW" | cut -f3)" = "success" ] \
    || stop "post-main CI is '$(printf '%s' "$ROW" | cut -f3)' — publication NOT CLOSED"
  POST="$ROW"
fi

# ---------------------------------------------------------------------------
# 8. fast-forward local main
# ---------------------------------------------------------------------------
say "[publish] 8/9 synchronizing local main (fast-forward only) ..."
git checkout main || stop "cannot checkout main"
[ -z "$(git status --porcelain=v1 | grep -v '^??')" ] || stop "local main has tracked modifications"
git merge --ff-only origin/main || stop "local main would not fast-forward"
[ "$(git rev-parse main)" = "$MERGE" ] || stop "local main != merge SHA"

# ---------------------------------------------------------------------------
# 9. protected state survived the checkout
# ---------------------------------------------------------------------------
say "[publish] 9/9 protected state ..."
for f in "${PROTECTED_FILES[@]}"; do
  [ -f "$f" ] || stop "protected file disappeared during sync: $f"
done
[ -d "$PROTECTED_EVIDENCE_DIR" ] || stop "$PROTECTED_EVIDENCE_DIR disappeared during sync"
git cat-file -t "$PROTECTED_STASH" >/dev/null 2>&1 || stop "protected stash disappeared"
[ "$(git ls-files docs/execution/ | wc -l | tr -d ' ')" = "0" ] || stop "lowercase docs/execution/ entries appeared in the index"

say ""
say "PUBLICATION=CLOSED / PASS"
say "PR=#$PR_NUM"
say "PR_URL=$PR_URL"
say "CANDIDATE_SHA=$m_candidate"
say "CANDIDATE_CI=${CI_RUN:-<none reported>}"
say "MERGE_SHA=$MERGE"
say "MERGE_PARENT_1=$P1"
say "MERGE_PARENT_2=$P2"
say "POST_MAIN_CI=$POST"
say "LOCAL_MAIN=$(git rev-parse main)"
say "PROTECTED_STATE=INTACT"
say "REVIEW=NOT_ACCESSED  PRODUCTION=NOT_ACCESSED  LEGACY=NOT_ACCESSED"
exit 0
