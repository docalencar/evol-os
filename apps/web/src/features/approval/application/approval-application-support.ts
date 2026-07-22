import type { z } from "zod"

import {
  ApprovalDomainError,
  type ApprovalRequest,
} from "../domain"
import type {
  ApprovalRequestRepository,
  ApprovalRequestRepositoryError,
} from "../repositories/approval-request-repository-contract"
import type {
  ApprovalApplicationError,
  ApprovalApplicationResult,
  ApprovalRequestApplicationResult,
} from "./approval-application-result"

export function validateCommand(
  schema: z.ZodType,
  command: unknown
): ApprovalApplicationError | null {
  const result = schema.safeParse(command)

  if (result.success) {
    return null
  }

  return {
    code: "invalid_input",
    message: "O comando de aprovação possui dados inválidos.",
    details: {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  }
}

export function failure<T>(
  error: ApprovalApplicationError
): ApprovalApplicationResult<T> {
  return { success: false, error }
}

export function success(
  approvalRequest: ApprovalRequest
): ApprovalRequestApplicationResult {
  return {
    success: true,
    data: { approvalRequest },
  }
}

export function mapRepositoryError(
  error: ApprovalRequestRepositoryError
): ApprovalApplicationError {
  return {
    code: error.code,
    message: error.message,
  }
}

export function mapApplicationError(
  error: unknown
): ApprovalApplicationError {
  if (error instanceof ApprovalDomainError) {
    return {
      code: "domain_error",
      message: error.message,
      details: {
        domainCode: error.code,
        ...error.details,
      },
    }
  }

  return {
    code: "unexpected_error",
    message: "Não foi possível executar a operação de aprovação.",
  }
}

export async function loadApprovalRequest(
  repository: ApprovalRequestRepository,
  companyId: string,
  approvalRequestId: string
): Promise<
  | { approvalRequest: ApprovalRequest; error: null }
  | { approvalRequest: null; error: ApprovalApplicationError }
> {
  let result

  try {
    result = await repository.findById(
      companyId,
      approvalRequestId
    )
  } catch (error) {
    return {
      approvalRequest: null,
      error: mapApplicationError(error),
    }
  }

  if (result.error) {
    return {
      approvalRequest: null,
      error: mapRepositoryError(result.error),
    }
  }

  if (!result.data) {
    return {
      approvalRequest: null,
      error: {
        code: "not_found",
        message: "Solicitação de aprovação não encontrada.",
      },
    }
  }

  return { approvalRequest: result.data, error: null }
}

export async function persistApprovalRequest(
  repository: ApprovalRequestRepository,
  approvalRequest: ApprovalRequest,
  expectedVersion: number
): Promise<ApprovalRequestApplicationResult> {
  let result

  try {
    result = await repository.save(
      approvalRequest,
      expectedVersion
    )
  } catch (error) {
    return failure(mapApplicationError(error))
  }

  if (result.error) {
    return failure(mapRepositoryError(result.error))
  }

  return success(result.data)
}
