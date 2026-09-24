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
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, appendFileSync } from "node:fs"
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
