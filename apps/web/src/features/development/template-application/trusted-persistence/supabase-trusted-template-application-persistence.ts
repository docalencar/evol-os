import type { DevelopmentTemplateApplicationResolution } from "../resolver"
import type {
  TrustedPersistenceDatabase,
  TrustedTemplateApplicationPersistence,
  TrustedTemplateApplicationPersistenceResult,
} from "./contracts"

type PersistenceRpcResult = Readonly<{
  status: string
  applicationId?: string
  attemptId?: string
  planId?: string
  snapshotId?: string
  failureCode?: string
}>

function errorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }
  return "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED"
}

function stableFailureCode(error: unknown): string {
  const message = errorMessage(error)
  const match = message.match(/[A-Z][A-Z0-9_]{2,}/)
  return match?.[0] ?? "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED"
}

const AUTHORIZATION_CODES = new Set([
  "ACTOR_NOT_AUTHORIZED",
  "AUTHORIZATION_FAILED",
  "DEVELOPMENT_TEMPLATE_PERSISTENCE_PERMISSION_DENIED",
  "PERMISSION_DENIED",
])

const INTEGRITY_CODES = new Set([
  "APPLICATION_CHANGED",
  "APPLICATION_ALREADY_COMPLETED",
  "APPLICATION_NOT_CONSUMABLE",
  "DEVELOPMENT_TEMPLATE_APPLICATION_NOT_FOUND",
  "DEVELOPMENT_TEMPLATE_ATTEMPT_INVALID",
  "DEVELOPMENT_TEMPLATE_COMPATIBILITY_CHANGED",
  "DEVELOPMENT_TEMPLATE_COMPETENCY_CHANGED",
  "DEVELOPMENT_TEMPLATE_COMPETENCY_LEVEL_CHANGED",
  "DEVELOPMENT_TEMPLATE_CONCEPT_VERSION_CHANGED",
  "DEVELOPMENT_TEMPLATE_EMPLOYEE_INVALID",
  "DEVELOPMENT_TEMPLATE_MAPPING_CHANGED",
  "DEVELOPMENT_TEMPLATE_OWNER_INVALID",
  "DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESULT",
  "DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESERVATION",
  "DEVELOPMENT_TEMPLATE_PERSISTENCE_RESOLUTION_MISMATCH",
  "DEVELOPMENT_TEMPLATE_VERSION_CONTENT_CHANGED",
  "DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE",
  "IDEMPOTENCY_FINGERPRINT_CONFLICT",
])

const TERMINAL_FAILURE_CODES = new Set([
  ...AUTHORIZATION_CODES,
  ...INTEGRITY_CODES,
])

function classifyFailure(
  code: string,
): TrustedTemplateApplicationPersistenceResult {
  if (AUTHORIZATION_CODES.has(code)) {
    return {
      status: "authorization_failure",
      code,
    }
  }

  if (INTEGRITY_CODES.has(code)) {
    return {
      status: "integrity_failure",
      code,
    }
  }

  return {
    status: "persistence_failure",
    code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED",
  }
}

function successfulResult(
  result: PersistenceRpcResult,
): TrustedTemplateApplicationPersistenceResult {
  if (
    (result.status === "created" || result.status === "idempotent_retry") &&
    result.applicationId &&
    result.planId &&
    result.snapshotId
  ) {
    return {
      status: result.status,
      applicationId: result.applicationId,
      planId: result.planId,
      snapshotId: result.snapshotId,
    }
  }
  if (result.status === "conflict" && result.applicationId) {
    return {
      status: "idempotency_conflict",
      applicationId: result.applicationId,
      code: "IDEMPOTENCY_FINGERPRINT_CONFLICT",
    }
  }
  if (
    result.status === "known_failure" &&
    result.applicationId &&
    result.failureCode
  ) {
    return {
      status: "known_failure",
      applicationId: result.applicationId,
      code: result.failureCode,
    }
  }
  return {
    status: "persistence_failure",
    code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESULT",
  }
}

export function createSupabaseTrustedTemplateApplicationPersistence(
  database: TrustedPersistenceDatabase,
): TrustedTemplateApplicationPersistence {
  return {
    async persist(resolution: DevelopmentTemplateApplicationResolution) {
      const reservation = await database.rpc(
        "reserve_development_template_application_v1",
        { p_resolution: resolution },
      )
      if (reservation.error) {
        return classifyFailure(stableFailureCode(reservation.error))
      }

      const reserved = reservation.data as PersistenceRpcResult
      if (reserved.status !== "acquired") {
        return successfulResult(reserved)
      }
      if (!reserved.applicationId || !reserved.attemptId) {
        return {
          status: "persistence_failure",
          code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_INVALID_RESERVATION",
        }
      }

      const completion = await database.rpc(
        "complete_development_template_application_v1",
        {
          p_resolution: resolution,
          p_attempt_id: reserved.attemptId,
        },
      )
      if (!completion.error) {
        return successfulResult(completion.data as PersistenceRpcResult)
      }

      const failureCode = stableFailureCode(completion.error)

      if (!TERMINAL_FAILURE_CODES.has(failureCode)) {
        return {
          status: "persistence_failure",
          code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED",
        }
      }

      const failure = await database.rpc(
        "fail_development_template_application_v1",
        {
          p_company_id: resolution.snapshot.application.companyId,
          p_application_id: reserved.applicationId,
          p_attempt_id: reserved.attemptId,
          p_fingerprint: resolution.fingerprint,
          p_failure_code: failureCode,
        },
      )
      if (failure.error) {
        return {
          status: "persistence_failure",
          code: "DEVELOPMENT_TEMPLATE_FAILURE_AUDIT_FAILED",
        }
      }
      return classifyFailure(failureCode)
    },
  }
}
