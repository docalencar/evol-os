import "server-only"

import { SecureAdministrativeReadService } from "@/features/authorization"

import { createAssessmentAdministrativeReadGateway } from "../repositories/assessment-secure-read-repository"
import type { AssessmentAdministrativeRead } from "../types/assessment-secure-read"
import { loadAssessmentActor } from "./load-assessment-actor"

export async function readAssessmentAdministratively(
  companyId: string,
  scope: "response" | "cycle" | "employee",
  scopeId: string,
  reason: string
): Promise<AssessmentAdministrativeRead> {
  const [actor, gateway] = await Promise.all([
    loadAssessmentActor(),
    createAssessmentAdministrativeReadGateway(),
  ])
  const service = new SecureAdministrativeReadService(actor, gateway)

  return service.read({
    companyId,
    scope,
    scopeId,
    reason,
  })
}
