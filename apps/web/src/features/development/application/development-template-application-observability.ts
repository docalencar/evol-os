export type DevelopmentTemplateApplicationObservation = Readonly<{
  operation: "readiness" | "apply"
  applicationId: string
  correlationId: string
  idempotencyKey: string
  outcome: "ready" | "blocked" | "created" | "idempotent_replay" | "conflict" | "authorization_failure" | "integrity_failure" | "persistence_failure"
  failureCode?: string
}>

export interface DevelopmentTemplateApplicationObserver {
  record(event: DevelopmentTemplateApplicationObservation): void
}

export function createDevelopmentTemplateApplicationObserver(
  write: (event: DevelopmentTemplateApplicationObservation) => void,
): DevelopmentTemplateApplicationObserver {
  return { record: write }
}

export function createConsoleDevelopmentTemplateApplicationObserver(): DevelopmentTemplateApplicationObserver {
  return createDevelopmentTemplateApplicationObserver((event) => {
    const method = event.outcome.endsWith("failure") || event.outcome === "blocked" || event.outcome === "conflict"
      ? console.warn
      : console.info
    method("development_template_application", event)
  })
}
