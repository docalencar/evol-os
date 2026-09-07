/**
 * Run-scoped names for the organization journey — RUNNER ONLY.
 *
 * Every entity the journey creates is named from the run id, which buys three
 * things at once: two concurrent runs never collide, an assertion can look for an
 * exact string instead of matching generic UI chrome, and spec 07 can assert the
 * *absence* of a name in another tenant without any risk of colliding with
 * unrelated Review data.
 *
 * The run id is a timestamp plus random hex. It carries no secret.
 */

export function departmentName(runId: string): string {
  return `E2E Dept ${runId}`
}

export function positionName(runId: string): string {
  return `E2E Position ${runId}`
}

export function teamName(runId: string): string {
  return `E2E Team ${runId}`
}

export function personName(runId: string): string {
  return `E2E Person ${runId}`
}

/**
 * Career / competency journey (spec 08). Same contract as above: exact,
 * run-scoped, ASCII — an accent in a selector buys nothing and costs encoding
 * surprises. The seniority `code` is a separate short identifier because the
 * catalog stores and displays it apart from the label, and its column is
 * `char_length(btrim(code)) between 1 and 40` (0100) — the run id fits with
 * room to spare.
 */

export function competencyName(runId: string): string {
  return `E2E Competency ${runId}`
}

export function seniorityLabel(runId: string): string {
  return `E2E Seniority ${runId}`
}

export function seniorityCode(runId: string): string {
  return `E2E-${runId}`
}
