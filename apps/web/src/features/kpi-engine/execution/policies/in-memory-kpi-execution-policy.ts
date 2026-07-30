import type { KPIBatchExecutionResult, KPIExecutionPolicy, KPIExecutionResult } from "../contracts"

export class InMemoryKPIExecutionPolicy implements KPIExecutionPolicy {
  private readonly completed = new Map<string, KPIExecutionResult | KPIBatchExecutionResult>()
  private readonly running = new Set<string>()
  private readonly interrupted = new Set<string>()

  begin(key: string, allowReexecution: boolean) {
    if (this.interrupted.has(key)) return Object.freeze({ allowed: false, reason: "interrupted" as const })
    if (this.running.has(key)) return Object.freeze({ allowed: false, reason: "in-progress" as const })
    const previous = this.completed.get(key)
    if (previous && !allowReexecution) return Object.freeze({ allowed: false, reason: "duplicate" as const, previous })
    this.running.add(key)
    return Object.freeze({ allowed: true, reason: "allowed" as const })
  }

  complete(key: string, result: KPIExecutionResult | KPIBatchExecutionResult): void {
    this.running.delete(key)
    this.completed.set(key, result)
  }

  fail(key: string): void { this.running.delete(key) }
  interrupt(key: string): void { this.running.delete(key); this.interrupted.add(key) }
}
