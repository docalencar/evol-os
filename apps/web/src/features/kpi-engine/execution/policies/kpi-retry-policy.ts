export interface KPIBackoffStrategy {
  durationMs(attemptNumber: number): number
}

export class ExponentialKPIBackoffStrategy implements KPIBackoffStrategy {
  constructor(private readonly initialMs: number, private readonly maximumMs: number) {}
  durationMs(attemptNumber: number): number {
    if (!Number.isInteger(attemptNumber) || attemptNumber <= 0) throw new Error("KPI_RETRY_INVALID_ATTEMPT")
    return Math.min(this.maximumMs, this.initialMs * (2 ** (attemptNumber - 1)))
  }
}

export type KPIRetryDecision = Readonly<{
  retry: boolean
  nextAttempt: number | null
  backoffMs: number
  reason: "retryable" | "non-retryable" | "max-attempts" | "explicit"
}>

export interface KPIRetryPolicy {
  decide(input: Readonly<{ attemptCount: number; errorCode: string; explicit: boolean }>): KPIRetryDecision
}

export class DefaultKPIRetryPolicy implements KPIRetryPolicy {
  constructor(private readonly maxAttempts: number, private readonly retryableErrors: readonly string[],
    private readonly backoff: KPIBackoffStrategy) {}
  decide(input: Readonly<{ attemptCount: number; errorCode: string; explicit: boolean }>): KPIRetryDecision {
    if (input.attemptCount >= this.maxAttempts) return decision(false, null, 0, "max-attempts")
    const retryable = input.explicit || this.retryableErrors.includes(input.errorCode)
    if (!retryable) return decision(false, null, 0, "non-retryable")
    const nextAttempt = input.attemptCount + 1
    return decision(true, nextAttempt, this.backoff.durationMs(nextAttempt), input.explicit ? "explicit" : "retryable")
  }
}

function decision(retry: boolean, nextAttempt: number | null, backoffMs: number,
  reason: KPIRetryDecision["reason"]): KPIRetryDecision {
  return Object.freeze({ retry, nextAttempt, backoffMs, reason })
}
