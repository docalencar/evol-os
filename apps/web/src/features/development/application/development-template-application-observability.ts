import { createHash } from "node:crypto"

export type DevelopmentTemplateApplicationObservation = Readonly<{
  operation: "readiness" | "apply"
  applicationId: string
  correlationId: string
  idempotencyKey: string
  outcome: "ready" | "blocked" | "created" | "idempotent_replay" | "conflict" | "authorization_failure" | "integrity_failure" | "persistence_failure"
  failureCode?: string
}>

export type SafeDevelopmentTemplateApplicationObservation = Readonly<
  Omit<DevelopmentTemplateApplicationObservation, "idempotencyKey"> & {
    idempotencyKeyHash: string
  }
>

export interface DevelopmentTemplateApplicationObserver {
  record(event: DevelopmentTemplateApplicationObservation): void
}

export function createDevelopmentTemplateApplicationObserver(
  write: (event: SafeDevelopmentTemplateApplicationObservation) => void,
): DevelopmentTemplateApplicationObserver {
  return {
    record(event) {
      const { idempotencyKey, ...safeEvent } = event
      write({
        ...safeEvent,
        idempotencyKeyHash: createHash("sha256").update(idempotencyKey).digest("hex"),
      })
    },
  }
}

export function createConsoleDevelopmentTemplateApplicationObserver(): DevelopmentTemplateApplicationObserver {
  return createDevelopmentTemplateApplicationObserver((event) => {
    const method = event.outcome.endsWith("failure") || event.outcome === "blocked" || event.outcome === "conflict"
      ? console.warn
      : console.info
    method("development_template_application", event)
  })
}
