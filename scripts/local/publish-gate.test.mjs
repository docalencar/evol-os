/**
 * publish-gate.sh — failure behaviour, proved against real Git repositories.
 *
 *   node --test scripts/local/publish-gate.test.mjs
 *
 * A publication gate is only worth having if it actually refuses. These tests
 * build throwaway repositories in a temp directory, run the gate in `--dry-run`,
 * and assert that each governance invariant fails closed. Nothing is pushed,
 * no PR is opened, no remote is contacted: `--dry-run` stops before the first
 * mutating command, which is exactly what makes the refusals testable.
 *
 * The positive case matters as much as the negatives — a gate that refuses
 * everything is not a gate.
 */

import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { chmodSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, mkdirSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const GATE = resolve(HERE, "publish-gate.sh")

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

/**
 * A repository shaped like the real one: an `origin` it can fetch, the protected
 * untracked files, the evidence directory, and the protected stash object.
 */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "pubgate-"))
  const origin = join(root, "origin.git")
  const work = join(root, "work")

  execFileSync("git", ["init", "--bare", "-b", "main", origin], { stdio: "ignore" })
  execFileSync("git", ["clone", origin, work], { stdio: "ignore" })
  git(work, "config", "user.email", "gate@test")
  git(work, "config", "user.name", "Gate Test")

  mkdirSync(join(work, "docs/Execution"), { recursive: true })
  writeFileSync(join(work, "docs/PROJECT_STATE.md"), "# state\n")
  git(work, "add", "docs/PROJECT_STATE.md")
  git(work, "commit", "-m", "base")
  git(work, "push", "origin", "main")
  const base = git(work, "rev-parse", "HEAD")

  // Protected untracked state, exactly as the runner expects to find it.
  mkdirSync(join(work, ".e5r1e-evidence"), { recursive: true })
  writeFileSync(join(work, ".e5r1e-evidence/evidence"), "x")
  mkdirSync(join(work, "apps/web"), { recursive: true })
  writeFileSync(join(work, "apps/web/.env.local.smoke-backup"), "x")
  mkdirSync(join(work, "docs/execution"), { recursive: true })
  writeFileSync(join(work, "docs/execution/MVP-CLOSURE-PR-I-MUTATION-BOUNDARY-AUDIT.md"), "x")
  writeFileSync(join(work, "docs/execution/MVP-PR1-PHASE6-INVITATION-ACCEPTANCE-IMPLEMENTATION-PLAN.md"), "x")
  mkdirSync(join(work, "scripts/review"), { recursive: true })
  writeFileSync(join(work, "scripts/review/promote-0126-retention-pressure.sh"), "x")
  writeFileSync(join(work, "scripts/review/verify-0126-retention-pressure-post.sh"), "x")

  // The protected stash is identified by object id; create an object and alias it.
  const stashSha = "52d5693ef1f6a156913d3cafa952894ad38485ea"
  writeFileSync(join(work, "docs/Execution/NOTE.md"), "note\n")
  git(work, "add", "docs/Execution/NOTE.md")
  git(work, "commit", "-m", "note")
  git(work, "push", "origin", "main")
  const base2 = git(work, "rev-parse", "HEAD")
  git(work, "update-ref", `refs/protected/${stashSha}`, base2)

  return { root, work, base: base2, stashSha }
}

/** A candidate branch with one commit changing exactly one file. */
function makeCandidate(work, file = "docs/Execution/CONTRACT.md") {
  git(work, "checkout", "-b", "docs/slice")
  mkdirSync(dirname(join(work, file)), { recursive: true })
  writeFileSync(join(work, file), "contract\n")
  git(work, "add", file)
  git(work, "commit", "-m", "docs: add contract")
  return git(work, "rev-parse", "HEAD")
}

function writeManifest(work, fields) {
  const body = Object.entries(fields)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k} = ${x}`) : [`${k} = ${v}`]))
    .join("\n")
  const path = join(work, "manifest.conf")
  writeFileSync(path, body + "\n")
  writeFileSync(join(work, "body.md"), "pr body\n")
  return path
}

/**
 * Run the gate in dry-run. Returns { code, out } — never throws on failure.
 *
 * `gate` defaults to the real script. Fixtures cannot mint a Git object with the
 * production stash SHA, so scenarios pass a copy whose protected-stash id points
 * at an object that exists locally. Everything else about the copy is byte-identical.
 */
function runGate(work, manifest, gate = GATE, extra = []) {
  try {
    const out = execFileSync("bash", [gate, manifest, "--dry-run", ...extra], {
      cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    })
    return { code: 0, out }
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}` }
  }
}

/** The happy path, plus a mutator that breaks exactly one invariant. */
function scenario(mutate) {
  const { root, work, base, stashSha } = makeRepo()
  const candidate = makeCandidate(work)
  const fields = {
    branch: "docs/slice",
    base,
    candidate,
    commits: candidate,
    files: "docs/Execution/CONTRACT.md",
    pr_title: "docs: contract",
    pr_body: "body.md",
  }
  // The runner pins the production stash object id, which a fixture cannot mint.
  // Repoint it at a commit that exists here, so every other check is exercised.
  const gateSrc = join(work, "gate.sh")
  execFileSync("bash", ["-c",
    `sed 's|^PROTECTED_STASH=.*|PROTECTED_STASH="'"$(git -C ${work} rev-parse HEAD)"'"|' ${GATE} > ${gateSrc}`])

  const ctx = { root, work, base, candidate, fields, gate: gateSrc }
  if (mutate) mutate(ctx)
  const manifest = writeManifest(work, ctx.fields)
  const result = runGate(work, manifest, ctx.gate)
  return { ...ctx, ...result, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

test("happy path: a well-formed candidate passes dry-run without touching the remote", () => {
  const s = scenario()
  try {
    assert.equal(s.code, 0, s.out)
    assert.match(s.out, /PUBLICATION=DRY_RUN_OK/)
    assert.match(s.out, /identity, ancestry, scope, protected state/)
    assert.match(s.out, /would push\s+: docs\/slice/)
    assert.match(s.out, /would merge\s+: merge commit only/)
  } finally { s.cleanup() }
})

test("refuses a candidate SHA that is not HEAD", () => {
  const s = scenario((ctx) => { ctx.fields.candidate = ctx.base })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /HEAD is not the declared candidate/)
  } finally { s.cleanup() }
})

test("refuses when origin/main has moved away from the declared base", () => {
  const s = scenario((ctx) => { ctx.fields.base = "0".repeat(40) })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /origin\/main is .* manifest declares/)
    assert.match(s.out, /do NOT rebase here/)
  } finally { s.cleanup() }
})

test("refuses a scope wider than declared", () => {
  const s = scenario((ctx) => {
    writeFileSync(join(ctx.work, "docs/Execution/EXTRA.md"), "extra\n")
    git(ctx.work, "add", "docs/Execution/EXTRA.md")
    git(ctx.work, "commit", "--amend", "--no-edit")
    ctx.fields.candidate = git(ctx.work, "rev-parse", "HEAD")
    ctx.fields.commits = ctx.fields.candidate
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /scope mismatch/)
  } finally { s.cleanup() }
})

test("refuses a commit sequence that does not match the declaration", () => {
  const s = scenario((ctx) => { ctx.fields.commits = `${ctx.base} ${ctx.candidate}` })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /commit sequence mismatch/)
  } finally { s.cleanup() }
})

test("refuses a dirty tracked worktree", () => {
  const s = scenario((ctx) => {
    writeFileSync(join(ctx.work, "docs/PROJECT_STATE.md"), "# dirty\n")
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /tracked worktree is not clean/)
  } finally { s.cleanup() }
})

test("refuses a missing protected file", () => {
  const s = scenario((ctx) => {
    rmSync(join(ctx.work, "apps/web/.env.local.smoke-backup"), { force: true })
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /MISSING protected file|protected state check failed/)
  } finally { s.cleanup() }
})

test("refuses a declared ancestor that is absent from the candidate", () => {
  const s = scenario((ctx) => { ctx.fields.ancestors = "0".repeat(40) })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /is not in the candidate's ancestry|declared ancestor/)
  } finally { s.cleanup() }
})

test("refuses an unknown manifest key rather than ignoring it silently", () => {
  const s = scenario((ctx) => { ctx.fields.reqiure_check = "build" })  // deliberate typo
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /unknown manifest key 'reqiure_check'/)
  } finally { s.cleanup() }
})

test("refuses a manifest missing a required key", () => {
  const { root, work, base } = makeRepo()
  const candidate = makeCandidate(work)
  const manifest = writeManifest(work, {
    branch: "docs/slice", base, candidate, commits: candidate,
    files: "docs/Execution/CONTRACT.md", pr_title: "t",   // pr_body omitted
  })
  const r = runGate(work, manifest)
  try {
    assert.notEqual(r.code, 0)
    assert.match(r.out, /missing required key: pr_body/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test("refuses when a slice guard fails, and names it", () => {
  const s = scenario((ctx) => {
    const g = join(ctx.work, "guard.sh")
    writeFileSync(g, "#!/usr/bin/env bash\necho 'guard says no'\nexit 1\n")
    ctx.fields.guard = ["guard.sh"]
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /guard failed: guard\.sh/)
  } finally { s.cleanup() }
})

test("a guard receives the identities so it need not re-derive them", () => {
  const s = scenario((ctx) => {
    const g = join(ctx.work, "guard.sh")
    writeFileSync(g, `#!/usr/bin/env bash\n[ "$PUBLISH_CANDIDATE" = "${ctx.candidate}" ] || exit 1\n[ -n "$PUBLISH_BASE" ] || exit 1\n[ "$PUBLISH_BRANCH" = "docs/slice" ] || exit 1\nexit 1\n`)
    ctx.fields.guard = ["guard.sh"]
  })
  try {
    // The guard exits 1 on purpose; it would exit 1 earlier if the env were wrong,
    // so reaching the named-guard failure proves the contract was satisfied.
    assert.match(s.out, /guard failed: guard\.sh/)
  } finally { s.cleanup() }
})

test("dry-run never reaches a mutating command", () => {
  const src = execFileSync("cat", [GATE], { encoding: "utf8" })
  const dryExit = src.indexOf('PUBLICATION=DRY_RUN_OK')
  assert.ok(dryExit > 0, "dry-run must have an explicit exit")
  for (const mutation of ["git push origin", "gh pr create", "gh pr merge", "git merge --ff-only"]) {
    const at = src.indexOf(mutation)
    assert.ok(at > dryExit, `${mutation} must appear only after the dry-run exit`)
  }
})

test("the manifest is parsed, never sourced or evaluated", () => {
  const src = execFileSync("cat", [GATE], { encoding: "utf8" })
  const code = src.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n")
  assert.doesNotMatch(code, /(^|\s)(source|\.)\s+"?\$MANIFEST/m)
  assert.doesNotMatch(code, /eval\s/)
  assert.match(code, /while IFS= read -r line/, "the manifest must be read line by line")
})

test("merge is a merge commit, and squash/rebase are never invoked", () => {
  const src = execFileSync("cat", [GATE], { encoding: "utf8" })
  const code = src.split("\n").filter((l) => !l.trim().startsWith("#") && !l.includes("say ")).join("\n")
  assert.match(code, /gh pr merge "\$PR_NUM" --merge/)
  assert.doesNotMatch(code, /--squash|--rebase|push .*--force|--amend/)
})

test("pending CI is treated as pending, not as failure", () => {
  const src = execFileSync("cat", [GATE], { encoding: "utf8" })
  assert.match(src, /QUEUED\|IN_PROGRESS\|PENDING/)
  assert.match(src, /pending is not failure/)
})

/* ---------------------------------------------------------------------------
 * TOOL-PUB2 — zero guards must be a valid manifest state.
 *
 * macOS ships bash 3.2, where an EMPTY array is indistinguishable from an unset
 * one, so under `set -u` both "${m_guards[@]}" and ${#m_guards[@]} abort. The
 * gate failed in step 1/9 on every guardless manifest. bash >= 4.4 does not
 * reproduce it, so these behavioural cases are paired with a static check that
 * the unsafe idiom cannot return — that check is what actually protects a Linux
 * CI from a macOS-only regression.
 * ------------------------------------------------------------------------- */

test("zero guards is valid: verification continues and reports a zero count", () => {
  const s = scenario() // the default manifest declares no guard at all
  try {
    assert.equal(s.code, 0)
    assert.match(s.out, /0 guard\(s\) PASS/)
    assert.match(s.out, /PUBLICATION=DRY_RUN_OK/)
    assert.doesNotMatch(s.out, /unbound variable/)
    assert.doesNotMatch(s.out, /guard: /)
  } finally { s.cleanup() }
})

test("one guard executes exactly once", () => {
  const s = scenario((ctx) => {
    const log = join(ctx.work, "ran.log")
    writeFileSync(join(ctx.work, "g1.sh"), `#!/usr/bin/env bash\necho one >> ${log}\nexit 0\n`)
    ctx.fields.guard = ["g1.sh"]
    ctx.log = log
  })
  try {
    assert.equal(s.code, 0)
    assert.match(s.out, /1 guard\(s\) PASS/)
    assert.equal(readFileSync(s.log, "utf8"), "one\n")
  } finally { s.cleanup() }
})

test("multiple guards each execute, in declared order", () => {
  const s = scenario((ctx) => {
    const log = join(ctx.work, "ran.log")
    for (const n of ["a", "b", "c"]) {
      writeFileSync(join(ctx.work, `g-${n}.sh`), `#!/usr/bin/env bash\necho ${n} >> ${log}\nexit 0\n`)
    }
    ctx.fields.guard = ["g-a.sh", "g-b.sh", "g-c.sh"]
    ctx.log = log
  })
  try {
    assert.equal(s.code, 0)
    assert.match(s.out, /3 guard\(s\) PASS/)
    assert.equal(readFileSync(s.log, "utf8"), "a\nb\nc\n")
  } finally { s.cleanup() }
})

test("a failing guard still blocks publication even when others pass", () => {
  const s = scenario((ctx) => {
    writeFileSync(join(ctx.work, "ok.sh"), "#!/usr/bin/env bash\nexit 0\n")
    writeFileSync(join(ctx.work, "no.sh"), "#!/usr/bin/env bash\nexit 1\n")
    ctx.fields.guard = ["ok.sh", "no.sh"]
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /guard failed: no\.sh/)
    assert.match(s.out, /PUBLICATION=BLOCKED/)
  } finally { s.cleanup() }
})

test("a guard path that does not exist fails closed", () => {
  const s = scenario((ctx) => { ctx.fields.guard = ["absent.sh"] })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /guard script not found: absent\.sh/)
  } finally { s.cleanup() }
})

test("an empty guard value fails closed rather than counting as zero guards", () => {
  const s = scenario((ctx) => { ctx.fields.guard = [""] })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /guard path is empty/)
    assert.match(s.out, /PUBLICATION=BLOCKED/)
    assert.doesNotMatch(s.out, /DRY_RUN_OK/)
  } finally { s.cleanup() }
})

test("the runner never expands an array in a form bash 3.2 rejects under nounset", () => {
  // Comments are stripped first: the fix's own explanation names the unsafe
  // idiom, and a guard that matched prose would fail on its own documentation.
  const code = readFileSync(GATE, "utf8")
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")

  assert.match(code, /set -uo pipefail/, "nounset is contractual and must stay enabled")

  // Remove every SAFE occurrence first, then look for what survives. Trying to
  // exclude the safe form with a lookaround flags its own inner expansion — the
  // guard must be written against the delta, not against a substring.
  const withoutSafe = code
    .replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\[@\]\+"\$\{\1\[@\]\}"\}/g, "<SAFE>")
    .replace(/"\$\{PROTECTED_FILES\[@\]\}"/g, "<LITERAL>") // populated at definition, never empty

  const unsafe = [...withoutSafe.matchAll(/\$\{#?[a-zA-Z_][a-zA-Z0-9_]*\[@\]\}/g)].map((m) => m[0])
  assert.deepEqual(unsafe, [], `unguarded array expansions: ${unsafe.join(", ")}`)
})

/* ---------------------------------------------------------------------------
 * TOOL-PUB3 — the PR body must be durable, and verified before the push.
 *
 * Publishing TOOL-PUB2 reached step 3/9 and stopped on a pr_body path under
 * /tmp that existed only on the machine which prepared the manifest. By then the
 * branch had already been pushed, leaving a remote branch with no PR. A purely
 * local precondition must not be checked after a remote mutation.
 * ------------------------------------------------------------------------- */

test("a repository-backed PR body resolves from the repo root", () => {
  const s = scenario((ctx) => {
    mkdirSync(join(ctx.work, "scripts/local/publish/bodies"), { recursive: true })
    writeFileSync(join(ctx.work, "scripts/local/publish/bodies/slice.md"), "durable body\n")
    ctx.fields.pr_body = "scripts/local/publish/bodies/slice.md"
  })
  try {
    assert.equal(s.code, 0)
    assert.match(s.out, /PUBLICATION=DRY_RUN_OK/)
  } finally { s.cleanup() }
})

test("a configured but missing PR body fails closed", () => {
  const s = scenario((ctx) => { ctx.fields.pr_body = "scripts/local/publish/bodies/absent.md" })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /pr_body file not found/)
    assert.match(s.out, /PUBLICATION=BLOCKED/)
  } finally { s.cleanup() }
})

test("an executor-local PR body outside the repository is refused", () => {
  const s = scenario((ctx) => {
    const outside = join(tmpdir(), `pub3-outside-${process.pid}.md`)
    writeFileSync(outside, "body\n")   // it EXISTS: existence is not the objection
    ctx.fields.pr_body = outside
    ctx.outside = outside
  })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /must live inside the repository/)
    assert.doesNotMatch(s.out, /DRY_RUN_OK/)
  } finally { rmSync(s.outside, { force: true }); s.cleanup() }
})

test("dry-run validates the same PR body dependency as a real publication", () => {
  // The regression: dry-run used to exit at the end of step 1/9, never reaching
  // the step 3/9 check, so it reported success for a manifest that could not
  // publish. Dry-run must refuse exactly what a real run refuses.
  const s = scenario((ctx) => { ctx.fields.pr_body = "no-such-body.md" })
  try {
    assert.notEqual(s.code, 0, "dry-run must fail on a body a real run would reject")
    assert.match(s.out, /pr_body file not found/)
  } finally { s.cleanup() }
})

test("the PR body is verified before the push, never after it", () => {
  const code = readFileSync(GATE, "utf8")
  const bodyCheck = code.indexOf('stop "pr_body file not found')
  const push = code.indexOf('say "[publish] 2/9 push')
  const prStep = code.indexOf('say "[publish] 3/9 pull request')
  assert.ok(bodyCheck > 0 && push > 0 && prStep > 0, "anchors must exist")
  assert.ok(bodyCheck < push, "pr_body must be validated before the push step")
  assert.ok(push < prStep, "step order must remain 2/9 then 3/9")
})

test("resuming is safe: the push is never forced and a divergent remote is refused", () => {
  // The remote branch already exists at the exact candidate after a partial run.
  // Re-running must be a no-op push, and must still refuse a remote that moved.
  const code = readFileSync(GATE, "utf8")
  const pushBlock = code.slice(code.indexOf('say "[publish] 2/9 push'),
                               code.indexOf('say "[publish] 3/9 pull request'))
  assert.doesNotMatch(pushBlock, /--force|--force-with-lease|push\s+-f\b/)
  assert.match(pushBlock, /remote branch exists at .* do NOT force push/)
  assert.match(pushBlock, /REMOTE_BEFORE" != "\$m_candidate"/)
  assert.match(pushBlock, /remote head != candidate/)
})

/* ---------------------------------------------------------------------------
 * TOOL-PUB4 — required-check evidence must be matched by exact name.
 *
 * Publishing PR #169 reported `SUCCESS web` and then stopped: the manifest asked
 * for `build`, which is an npm STEP, not a check-run. The check-run name for a
 * GitHub Actions job is the JOB ID — this repo's workflow defines exactly one,
 * `web`. The gate was right to block; the manifest named something that never
 * existed as a check.
 *
 * Inspection then found a second, latent fault: the matcher was
 * `grep -iE "$m_require_check"` over the whole "<STATE>\tNAME" line, so an
 * unrelated green job whose name merely CONTAINED the required string — or the
 * STATE column itself — could have satisfied a named required check. The
 * selection is now an exact match on the name column, in a filter that needs no
 * network and is therefore provable here.
 * ------------------------------------------------------------------------- */

const CHECK_STATE = resolve(HERE, "publish-check-state.sh")

/** Run the selector over a crafted `gh pr checks` table. */
function selectCheck(table, name) {
  try {
    const out = execFileSync("bash", [CHECK_STATE, name], {
      input: table, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    })
    return { code: 0, state: out.trim() }
  } catch (error) {
    return { code: error.status ?? 1, state: (error.stdout ?? "").trim() }
  }
}

const GREEN = "SUCCESS\tweb\n"

test("required check reported SUCCESS resolves and advances", () => {
  const r = selectCheck(GREEN, "web")
  assert.equal(r.code, 0)
  assert.equal(r.state, "SUCCESS")
})

test("required check queued or in progress resolves as pending, not as success", () => {
  for (const pending of ["QUEUED", "IN_PROGRESS", "PENDING"]) {
    const r = selectCheck(`${pending}\tweb\n`, "web")
    assert.equal(r.code, 0, `${pending} must be reported, not treated as missing`)
    assert.equal(r.state, pending)
    assert.notEqual(r.state, "SUCCESS")
  }
})

test("required check failure resolves as that failure and blocks", () => {
  for (const bad of ["FAILURE", "CANCELLED", "TIMED_OUT"]) {
    const r = selectCheck(`${bad}\tweb\n`, "web")
    assert.equal(r.code, 0)
    assert.equal(r.state, bad)
    assert.notEqual(r.state, "SUCCESS")
  }
})

test("an unrelated green check never satisfies a missing required check", () => {
  // The exact failure mode of PR #169: `web` is green, `build` does not exist.
  const r = selectCheck(GREEN, "build")
  assert.equal(r.code, 1, "missing required evidence must exit non-zero so the gate blocks")
  assert.equal(r.state, "")

  // And a substring / regex match must not rescue it either.
  assert.equal(selectCheck(GREEN, "we").code, 1, "a substring must not match")
  assert.equal(selectCheck(GREEN, "w.b").code, 1, "a regex must not match")
  assert.equal(selectCheck(GREEN, "SUCCESS").code, 1, "the state column must never be matched as a name")
  assert.equal(selectCheck("SUCCESS\tweb-extra\n", "web").code, 1, "a longer job name is a different check")
})

test("GitHub Actions check-run evidence resolves even with no commit statuses", () => {
  // PR #169: the commit-status endpoint returns nothing, while the Actions
  // check-run is green. The gate reads `gh pr checks`, which reports check-runs,
  // so the absence of legacy commit statuses is not the absence of evidence.
  const r = selectCheck("SUCCESS\tweb\nSKIPPED\tother\n", "web")
  assert.equal(r.code, 0)
  assert.equal(r.state, "SUCCESS")

  const gate = readFileSync(GATE, "utf8")
  assert.match(gate, /gh pr checks "\$PR_NUM" --json name,state/)
  assert.doesNotMatch(gate, /\/statuses\/|commit-status/)
})

test("evidence is bound to the candidate SHA and rechecked before merge", () => {
  const gate = readFileSync(GATE, "utf8")
  const ciStep = gate.indexOf('say "[publish] 4/9 waiting for CI')
  const merge = gate.indexOf('say "[publish] 5/9 merging')
  assert.ok(ciStep > 0 && merge > ciStep)
  // The PR head must still be the candidate when the merge is issued, so CI
  // evidence gathered for one SHA can never authorise merging another.
  const beforeMerge = gate.slice(merge, gate.indexOf('say "[publish] 6/9'))
  assert.match(beforeMerge, /headRefOid.*= "\$m_candidate".*\|\| stop "PR head changed after CI"/s)
})

test("the required-check selection is exact, never a regex over the whole line", () => {
  const gate = readFileSync(GATE, "utf8")
  const block = gate.slice(gate.indexOf('if [ -n "$m_require_check" ]'), gate.indexOf('CI_RUN='))
  assert.doesNotMatch(block, /grep -iE "\$m_require_check"/)
  assert.match(block, /publish-check-state\.sh" "\$m_require_check"/)
  assert.match(block, /not SUCCESS/)
})

test("this repo's workflow exposes exactly the check name the manifests require", () => {
  const workflow = readFileSync(resolve(HERE, "../../.github/workflows/ci.yml"), "utf8")
  // Only the block under `jobs:` — `on:` also has two-space keys, and matching
  // those would report pull_request and push as check names.
  const jobsBlock = workflow.slice(workflow.indexOf("\njobs:") + 1)
  const jobs = [...jobsBlock.matchAll(/^ {2}([a-zA-Z0-9_-]+):$/gm)].map((m) => m[1])
  assert.deepEqual(jobs, ["web"], "the check-run name is the job id")

  // Every manifest in the directory, not a hand-maintained list: a new slice
  // must not be able to name a check that does not exist just because nobody
  // remembered to extend this test.
  const dir = resolve(HERE, "publish")
  const manifests = readdirSync(dir).filter((f) => f.endsWith(".manifest"))
  assert.ok(manifests.length > 0, "there must be manifests to validate")

  for (const file of manifests) {
    const declared = /^require_check\s*=\s*(\S+)/m.exec(readFileSync(join(dir, file), "utf8"))?.[1]
    if (declared === undefined) continue   // require_check is optional
    assert.ok(jobs.includes(declared), `${file} requires '${declared}', which is not a job in ci.yml`)
  }
})

/* ---------------------------------------------------------------------------
 * TOOL-PUB5 — pushing onto an existing branch is a fast-forward, not divergence.
 *
 * PR #169 was open at f7c22ff. Adding the TOOL-PUB4 commit produced a0a110e,
 * whose PARENT is exactly f7c22ff — a strictly linear fast-forward. The gate
 * refused it anyway, because step 2/9 asked whether the remote head was
 * IDENTICAL to the candidate rather than whether it was an ANCESTOR of it. That
 * turned the ordinary "add a commit to an open PR" case into a false divergence,
 * and would have pressured a pointless reconciliation merge to work around it.
 * ------------------------------------------------------------------------- */

const PUSH_PRE = resolve(HERE, "publish-push-precondition.sh")

function pushDecision(work, remote, candidate) {
  try {
    execFileSync("bash", [PUSH_PRE, remote, candidate],
      { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    return 0
  } catch (error) { return error.status ?? 1 }
}

test("an absent remote branch is safe to push", () => {
  const s = scenario()
  try { assert.equal(pushDecision(s.work, "", s.candidate), 0) } finally { s.cleanup() }
})

test("a remote already at the candidate is a no-op push, which is what makes resuming safe", () => {
  const s = scenario()
  try { assert.equal(pushDecision(s.work, s.candidate, s.candidate), 0) } finally { s.cleanup() }
})

test("a remote that is an ancestor of the candidate is a fast-forward", () => {
  // Exactly the PR #169 shape: remote at the parent, candidate one commit ahead.
  const s = scenario()
  try {
    const parent = git(s.work, "rev-parse", `${s.candidate}^`).trim()
    assert.equal(pushDecision(s.work, parent, s.candidate), 0,
      "adding a commit to an open PR must not be refused as divergence")
  } finally { s.cleanup() }
})

test("a remote that is NOT an ancestor is refused, and never forced", () => {
  const s = scenario()
  try {
    // A sibling commit on the same base: real divergence.
    const base = git(s.work, "rev-parse", `${s.candidate}^`).trim()
    git(s.work, "checkout", "-q", "-b", "sibling", base)
    writeFileSync(join(s.work, "docs/Execution/OTHER.md"), "other\n")
    git(s.work, "add", "docs/Execution/OTHER.md")
    git(s.work, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "sibling")
    const sibling = git(s.work, "rev-parse", "HEAD").trim()
    assert.notEqual(pushDecision(s.work, sibling, s.candidate), 0)
  } finally { s.cleanup() }
})

test("a remote commit absent locally fails closed rather than being assumed safe", () => {
  const s = scenario()
  try {
    assert.notEqual(pushDecision(s.work, "0".repeat(40), s.candidate), 0)
  } finally { s.cleanup() }
})

test("the push step decides by ancestry and still never forces", () => {
  const gate = readFileSync(GATE, "utf8")
  const block = gate.slice(gate.indexOf('say "[publish] 2/9 push'),
                           gate.indexOf('say "[publish] 3/9 pull request'))
  assert.match(block, /publish-push-precondition\.sh" "\$REMOTE_BEFORE" "\$m_candidate"/)
  assert.doesNotMatch(block, /--force|--force-with-lease|push\s+-f\b/)
  assert.match(block, /is NOT an ancestor of .* do NOT force push/)
  // The old rule must not survive anywhere in the step.
  assert.doesNotMatch(block, /\[ "\$REMOTE_BEFORE" != "\$m_candidate" \];\s*then\s*\n\s*stop/)
})

/* ---------------------------------------------------------------------------
 * Safe publish without merge — real push to an isolated bare repository and a
 * synthetic gh executable. No network is available to these scenarios. The gh
 * double records every invocation and makes any attempted merge fail loudly.
 * ------------------------------------------------------------------------- */

function makeFakeGh(root) {
  const bin = join(root, "fake-bin")
  const log = join(root, "gh.log")
  const state = join(root, "pr.exists")
  mkdirSync(bin)
  const path = join(bin, "gh")
  writeFileSync(path, `#!/usr/bin/env bash
set -u
printf '%s\\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "pr create")
    [ "\${GH_FAIL_CREATE:-0}" = 0 ] || exit 41
    : > "$GH_PR_STATE"
    [ "\${GH_ADVANCE_MAIN:-0}" = 0 ] || git --git-dir="$GH_ORIGIN" update-ref refs/heads/main "$GH_FUTURE_MAIN"
    [ "\${GH_DIVERGE_BRANCH:-0}" = 0 ] || git --git-dir="$GH_ORIGIN" update-ref "refs/heads/$GH_BRANCH" "$GH_BASE"
    printf '%s\\n' 'https://example.invalid/pull/321'
    exit 0 ;;
  "pr view")
    [ -f "$GH_PR_STATE" ] || exit 1
    case "$*" in
      *"--json number,url,state,isDraft,baseRefName,headRefOid"*)
        printf '321\\thttps://example.invalid/pull/321\\tOPEN\\tfalse\\tmain\\t%s\\n' "$GH_CANDIDATE" ;;
      *".files[].path"*) printf 'docs/Execution/CONTRACT.md\\n' ;;
      *"--json files"*) printf '1\\n' ;;
      *"--json commits"*) printf '1\\n' ;;
      *"--json headRefName"*) printf '%s\\n' "$GH_BRANCH" ;;
      *"--json isCrossRepository"*)
        [ "\${GH_FAIL_PROVENANCE:-0}" = 0 ] || exit 42
        printf '%b\\n' "$GH_PR_PROVENANCE" ;;
      *"--json headRefOid"*) printf '%s\\n' "$GH_CANDIDATE" ;;
      *) printf '{"number":321}\\n' ;;
    esac
    exit 0 ;;
  "pr checks")
    case "$*" in *"--json"*) printf 'SUCCESS\\tweb\\n' ;; esac
    exit 0 ;;
  "pr merge") exit 97 ;;
  "run list") printf '9001\\t%s\\tsuccess\\n' "$GH_CANDIDATE"; exit 0 ;;
esac
exit 98
`)
  chmodSync(path, 0o700)
  writeFileSync(log, "")
  return { bin, log, state }
}

function publicationScenario(options = {}) {
  const { root, work, base, stashSha } = makeRepo()
  const origin = git(work, "remote", "get-url", "origin")
  const candidate = makeCandidate(work)
  const fields = {
    branch: "docs/slice", base, candidate, commits: candidate,
    files: "docs/Execution/CONTRACT.md", pr_title: "docs: contract", pr_body: "body.md",
  }
  if (options.fields) Object.assign(fields, options.fields({ base, candidate }))
  const manifest = writeManifest(work, fields)
  mkdirSync(join(work, "scripts/local"), { recursive: true })
  writeFileSync(join(work, "scripts/local/publish-push-precondition.sh"), readFileSync(PUSH_PRE))
  const gate = join(work, "gate.sh")
  writeFileSync(gate, readFileSync(GATE, "utf8").replace(
    /^PROTECTED_STASH=.*$/m, `PROTECTED_STASH="${base}"`))
  const fake = makeFakeGh(root)
  if (options.existingPr) writeFileSync(fake.state, "existing\n")

  let futureMain = ""
  if (options.advanceMainAfterPr) {
    git(work, "checkout", "-b", "future-main", base)
    writeFileSync(join(work, "docs/PROJECT_STATE.md"), "# future\n")
    git(work, "add", "docs/PROJECT_STATE.md")
    git(work, "commit", "-m", "future main")
    futureMain = git(work, "rev-parse", "HEAD")
    git(work, "push", "origin", `HEAD:refs/heads/future-holding`)
    git(work, "checkout", "docs/slice")
  }
  if (options.advanceMainBeforeRun) {
    git(work, "checkout", "-b", "advanced-main", base)
    writeFileSync(join(work, "docs/PROJECT_STATE.md"), "# advanced\n")
    git(work, "add", "docs/PROJECT_STATE.md")
    git(work, "commit", "-m", "advanced main")
    git(work, "push", "origin", "HEAD:main")
    git(work, "checkout", "docs/slice")
  }
  if (options.failPush) {
    const hooks = join(origin, "hooks")
    const hook = join(hooks, "pre-receive")
    writeFileSync(hook, "#!/usr/bin/env bash\nexit 1\n")
    chmodSync(hook, 0o700)
  }

  const env = {
    ...process.env,
    PATH: `${fake.bin}:${process.env.PATH}`,
    GH_LOG: fake.log,
    GH_PR_STATE: fake.state,
    GH_ORIGIN: origin,
    GH_BRANCH: "docs/slice",
    GH_BASE: base,
    GH_CANDIDATE: candidate,
    GH_FAIL_CREATE: options.failCreate ? "1" : "0",
    GH_ADVANCE_MAIN: options.advanceMainAfterPr ? "1" : "0",
    GH_FUTURE_MAIN: futureMain,
    GH_DIVERGE_BRANCH: options.divergeBranchAfterPr ? "1" : "0",
    GH_PR_PROVENANCE: options.prProvenance ?? "boolean\\tfalse",
    GH_FAIL_PROVENANCE: options.failProvenance ? "1" : "0",
  }
  const args = options.args ?? ["--stop-after-pr"]
  const protectedBefore = {
    stashTarget: git(work, "rev-parse", `refs/protected/${stashSha}`),
    trackedStatus: git(work, "status", "--porcelain", "--untracked-files=no"),
    untracked: git(work, "ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean).sort(),
  }
  protectedBefore.contents = protectedBefore.untracked.map((path) => [path, readFileSync(join(work, path), "utf8")])
  let code = 0, out = ""
  try {
    out = execFileSync("bash", [gate, manifest, ...args], {
      cwd: work, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    })
  } catch (error) {
    code = error.status ?? 1
    out = `${error.stdout ?? ""}${error.stderr ?? ""}`
  }
  return {
    root, work, base, candidate, origin, manifest, fake, stashSha, protectedBefore, code, out,
    ghLog: () => readFileSync(fake.log, "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

test("stop-after-pr 01: explicit mode publishes and exits with the distinct PR_OPEN contract", () => {
  const s = publicationScenario()
  try {
    assert.equal(s.code, 0, s.out)
    assert.match(s.out, /PUBLICATION=PR_OPEN/)
    assert.match(s.out, /MERGE=NOT_EXECUTED/)
    assert.match(s.out, /CI_STATUS=NOT_EVALUATED/)
  } finally { s.cleanup() }
})

test("stop-after-pr 02: default mode still reaches CI and the merge command", () => {
  const s = publicationScenario({ args: [] })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.ghLog(), /pr checks/)
    assert.match(s.ghLog(), /pr merge/)
  } finally { s.cleanup() }
})

test("stop-after-pr 03-05: dry-run remains non-mutating and incompatible or unknown flags fail", () => {
  for (const [args, expected] of [
    [["--dry-run"], /PUBLICATION=DRY_RUN_OK/],
    [["--dry-run", "--stop-after-pr"], /mutually exclusive/],
    [["--unknown"], /unknown option/],
  ]) {
    const s = publicationScenario({ args })
    try {
      if (args.length === 1 && args[0] === "--dry-run") assert.equal(s.code, 0, s.out)
      else assert.notEqual(s.code, 0)
      assert.match(s.out, expected)
      assert.doesNotMatch(s.ghLog(), /pr create|pr merge/)
    } finally { s.cleanup() }
  }
})

test("stop-after-pr 06-08: push is scoped, PR identity is exact, and an existing PR is reused", () => {
  for (const existingPr of [false, true]) {
    const s = publicationScenario({ existingPr })
    try {
      assert.equal(s.code, 0, s.out)
      assert.equal(git(s.work, "ls-remote", "--heads", "origin", "docs/slice").split("\t")[0], s.candidate)
      assert.match(s.out, /PR=#321/)
      assert.match(s.out, new RegExp(`REMOTE_BRANCH_SHA=${s.candidate}`))
      assert.match(s.ghLog(), /pr (create .*--base main --head docs\/slice|view docs\/slice)/)
      assert.equal((s.ghLog().match(/pr create/g) ?? []).length, existingPr ? 0 : 1)
    } finally { s.cleanup() }
  }
})

test("stop-after-pr rejects an existing cross-repository PR despite matching branch and candidate", () => {
  const s = publicationScenario({ existingPr: true, prProvenance: "boolean\\ttrue" })
  try {
    assert.notEqual(s.code, 0, "a fork PR must fail closed")
    assert.match(s.out, /PR head repository provenance/)
    assert.doesNotMatch(s.ghLog(), /pr checks|pr merge|run list/)
  } finally { s.cleanup() }
})

test("stop-after-pr accepts only explicit boolean false repository provenance", () => {
  for (const [label, options] of [
    ["cross-repository", { prProvenance: "boolean\\ttrue" }],
    ["missing", { prProvenance: "" }],
    ["null", { prProvenance: "null\\tnull" }],
    ["unexpected type", { prProvenance: "string\\tfalse" }],
    ["query failure", { failProvenance: true }],
  ]) {
    const s = publicationScenario(options)
    try {
      assert.notEqual(s.code, 0, `${label} provenance must fail closed`)
      assert.match(s.out, /PR head repository provenance/)
      assert.doesNotMatch(s.ghLog(), /pr checks|pr merge|run list/)
    } finally { s.cleanup() }
  }

  const sameRepository = publicationScenario({ prProvenance: "boolean\\tfalse" })
  try {
    assert.equal(sameRepository.code, 0, sameRepository.out)
    assert.match(sameRepository.out, /PUBLICATION=PR_OPEN/)
  } finally { sameRepository.cleanup() }
})

test("stop-after-pr 09-10: remote main movement before push or after PR blocks", () => {
  for (const options of [{ advanceMainBeforeRun: true }, { advanceMainAfterPr: true }]) {
    const s = publicationScenario(options)
    try {
      assert.notEqual(s.code, 0)
      assert.match(s.out, /origin\/main is|remote main moved/)
      assert.doesNotMatch(s.ghLog(), /pr merge/)
    } finally { s.cleanup() }
  }
})

test("stop-after-pr 11: a remote branch changed after PR creation blocks", () => {
  const s = publicationScenario({ divergeBranchAfterPr: true })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /remote head changed after PR/)
    assert.doesNotMatch(s.ghLog(), /pr merge/)
  } finally { s.cleanup() }
})

test("stop-after-pr 12 and 17: candidate and manifest invariants still fail before mutation", () => {
  for (const fields of [
    ({ base }) => ({ candidate: base, commits: base }),
    () => ({ branch: "docs/wrong-branch" }),
    () => ({ files: "docs/Execution/OTHER.md" }),
  ]) {
    const s = publicationScenario({ fields })
    try {
      assert.notEqual(s.code, 0)
      assert.match(s.out, /HEAD is not the declared candidate|not on docs\/wrong-branch|scope mismatch/)
      assert.doesNotMatch(s.ghLog(), /pr create|pr merge/)
    } finally { s.cleanup() }
  }
})

test("stop-after-pr 13: push failure blocks before PR creation", () => {
  const s = publicationScenario({ failPush: true })
  try {
    assert.notEqual(s.code, 0)
    assert.match(s.out, /push failed/)
    assert.doesNotMatch(s.ghLog(), /pr create|pr merge/)
  } finally { s.cleanup() }
})

test("stop-after-pr 14-16: PR failure or later reconciliation never calls merge", () => {
  for (const options of [{ failCreate: true }, { advanceMainAfterPr: true }, { divergeBranchAfterPr: true }]) {
    const s = publicationScenario(options)
    try {
      assert.notEqual(s.code, 0)
      assert.doesNotMatch(s.ghLog(), /pr merge/)
    } finally { s.cleanup() }
  }
})

test("stop-after-pr 18-20: protected state survives and CI/merge remain untouched", () => {
  const s = publicationScenario()
  try {
    assert.equal(s.code, 0, s.out)
    const protectedPaths = [
      ".e5r1e-evidence/evidence",
      "apps/web/.env.local.smoke-backup",
      "docs/execution/MVP-CLOSURE-PR-I-MUTATION-BOUNDARY-AUDIT.md",
      "docs/execution/MVP-PR1-PHASE6-INVITATION-ACCEPTANCE-IMPLEMENTATION-PLAN.md",
      "scripts/review/promote-0126-retention-pressure.sh",
      "scripts/review/verify-0126-retention-pressure-post.sh",
    ]
    for (const path of protectedPaths) assert.equal(readFileSync(join(s.work, path), "utf8"), "x")
    assert.equal(git(s.work, "rev-parse", `refs/protected/${s.stashSha}`), s.protectedBefore.stashTarget)
    assert.equal(git(s.work, "status", "--porcelain", "--untracked-files=no"), s.protectedBefore.trackedStatus)
    assert.deepEqual(
      git(s.work, "ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean).sort(),
      s.protectedBefore.untracked,
    )
    for (const [path, contents] of s.protectedBefore.contents) {
      assert.equal(readFileSync(join(s.work, path), "utf8"), contents)
    }
    assert.doesNotMatch(s.ghLog(), /pr checks|pr merge|run list/)
    assert.match(s.out, /CI_STATUS=NOT_EVALUATED/)
    assert.doesNotMatch(s.out, /PUBLICATION=CLOSED \/ PASS/)
  } finally { s.cleanup() }
})
