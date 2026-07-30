export type ExecutionLease = Readonly<{
  executionId: string
  ownerId: string
  leaseId: string
  acquiredAt: Date
  expiresAt: Date
  renewedAt: Date | null
}>

export function acquireExecutionLease(input: Readonly<{
  executionId: string; ownerId: string; leaseId: string; acquiredAt: Date; durationMs: number
}>): ExecutionLease {
  requirePositiveDuration(input.durationMs)
  return freezeLease({ executionId: requireText(input.executionId), ownerId: requireText(input.ownerId),
    leaseId: requireText(input.leaseId), acquiredAt: input.acquiredAt,
    expiresAt: addMilliseconds(input.acquiredAt, input.durationMs), renewedAt: null })
}

export function renewExecutionLease(lease: ExecutionLease, ownerId: string, at: Date,
  durationMs: number): ExecutionLease {
  assertOwner(lease, ownerId); requirePositiveDuration(durationMs)
  if (isExecutionLeaseExpired(lease, at)) throw new Error("KPI_EXECUTION_LEASE_EXPIRED")
  return freezeLease({ ...lease, renewedAt: at, expiresAt: addMilliseconds(at, durationMs) })
}

export function releaseExecutionLease(lease: ExecutionLease, ownerId: string): null {
  assertOwner(lease, ownerId); return null
}

export function expireExecutionLease(lease: ExecutionLease, at: Date): ExecutionLease {
  if (!isExecutionLeaseExpired(lease, at)) throw new Error("KPI_EXECUTION_LEASE_NOT_EXPIRED")
  return lease
}

export function stealExpiredExecutionLease(lease: ExecutionLease, input: Readonly<{
  ownerId: string; leaseId: string; acquiredAt: Date; durationMs: number
}>): ExecutionLease {
  expireExecutionLease(lease, input.acquiredAt)
  return acquireExecutionLease({ executionId: lease.executionId, ...input })
}

export function isExecutionLeaseExpired(lease: ExecutionLease, at: Date): boolean {
  return lease.expiresAt.getTime() <= at.getTime()
}

function addMilliseconds(at: Date, durationMs: number): Date {
  const result = structuredClone(at); result.setTime(at.getTime() + durationMs); return result
}
function freezeLease(lease: ExecutionLease): ExecutionLease { return Object.freeze({ ...lease }) }
function assertOwner(lease: ExecutionLease, ownerId: string): void {
  if (lease.ownerId !== ownerId) throw new Error("KPI_EXECUTION_LEASE_OWNER_MISMATCH")
}
function requirePositiveDuration(value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error("KPI_EXECUTION_LEASE_INVALID_DURATION")
}
function requireText(value: string): string {
  if (value.trim() === "") throw new Error("KPI_EXECUTION_LEASE_INVALID_ID"); return value
}
