export type DevelopmentTemplateConfirmationIdentity = Readonly<{
  applicationId: string
  idempotencyKey: string
  correlationId: string
  effectiveAt: string
}>

export function createDevelopmentTemplateConfirmationIdentity(
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): DevelopmentTemplateConfirmationIdentity {
  return {
    applicationId: createId(),
    idempotencyKey: createId(),
    correlationId: createId(),
    effectiveAt: now().toISOString(),
  }
}
