import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  ApprovalRequest,
} from "../domain"
import {
  mapApprovalDomainEventsToPersistence,
  mapApprovalRequestToDomain,
  mapApprovalRequestToPersistence,
} from "../mappers"
import type {
  ApprovalRequestPersistenceRecord,
} from "../persistence"
import type {
  ApprovalRequestRepository,
  ApprovalRequestRepositoryError,
  FindApprovalRequestsInput,
} from "./approval-request-repository-contract"

const APPROVAL_REQUEST_SELECT = `
  *,
  approval_stages (
    *,
    approval_assignments (*)
  ),
  approval_decisions (*)
`

function mapRepositoryError(error: {
  code?: string
  message: string
}): ApprovalRequestRepositoryError {
  const versionConflict =
    error.code === "40001" ||
    error.message.includes("APPROVAL_VERSION_CONFLICT")

  return {
    code: versionConflict
      ? "version_conflict"
      : "persistence_error",
    message: versionConflict
      ? "A solicitação de aprovação foi alterada por outra operação."
      : error.message,
  }
}

export async function createApprovalRequestRepository(): Promise<
  ApprovalRequestRepository
> {
  const supabase = await createServerDatabase()

  return {
    async findById(
      companyId: string,
      approvalRequestId: string
    ) {
      const { data, error } = await supabase
        .from("approval_requests")
        .select(APPROVAL_REQUEST_SELECT)
        .eq("company_id", companyId)
        .eq("id", approvalRequestId)
        .maybeSingle()

      if (error) {
        return {
          data: null,
          error: mapRepositoryError(error),
        }
      }

      try {
        return {
          data: data
            ? mapApprovalRequestToDomain(
                data as unknown as ApprovalRequestPersistenceRecord
              )
            : null,
          error: null,
        }
      } catch (error) {
        return {
          data: null,
          error: {
            code: "persistence_error" as const,
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível hidratar a solicitação de aprovação.",
          },
        }
      }
    },

    async findAll(input: FindApprovalRequestsInput) {
      let query = supabase
        .from("approval_requests")
        .select(APPROVAL_REQUEST_SELECT)
        .eq("company_id", input.companyId)
        .order("requested_at", {
          ascending: false,
        })

      if (input.status) {
        query = query.eq("status", input.status)
      }

      if (input.module) {
        query = query.eq("module", input.module)
      }

      if (input.entityType) {
        query = query.eq("entity_type", input.entityType)
      }

      if (input.entityId) {
        query = query.eq("entity_id", input.entityId)
      }

      const { data, error } = await query

      if (error) {
        return {
          data: null,
          error: mapRepositoryError(error),
        }
      }

      try {
        return {
          data: (data ?? []).map((record) =>
            mapApprovalRequestToDomain(
              record as unknown as ApprovalRequestPersistenceRecord
            )
          ),
          error: null,
        }
      } catch (error) {
        return {
          data: null,
          error: {
            code: "persistence_error" as const,
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível hidratar as solicitações de aprovação.",
          },
        }
      }
    },

    async save(
      request: ApprovalRequest,
      expectedVersion: number
    ) {
      const aggregate =
        mapApprovalRequestToPersistence(request)
      const events =
        mapApprovalDomainEventsToPersistence(
          request.getPendingDomainEvents()
        )
      const { error } = await supabase.rpc(
        "save_approval_request",
        {
          p_aggregate: aggregate,
          p_events: events,
          p_expected_version: expectedVersion,
        }
      )

      if (error) {
        return {
          data: null,
          error: mapRepositoryError(error),
        }
      }

      request.clearPendingDomainEvents()

      return {
        data: request,
        error: null,
      }
    },
  }
}
