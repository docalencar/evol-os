import {
  assertApprovalDomain,
} from "../errors/approval-domain-error"
import {
  requireText,
} from "./shared"

export type ApprovalContextValue =
  | string
  | number
  | boolean
  | null
  | readonly ApprovalContextValue[]
  | Readonly<{
      [key: string]: ApprovalContextValue
    }>

export type ApprovalContextMetadata = Readonly<{
  [key: string]: ApprovalContextValue
}>

export type ApprovalContext = Readonly<{
  schemaVersion: string
  summary: string
  metadata: ApprovalContextMetadata
}>

export type CreateApprovalContextInput = {
  schemaVersion: string
  summary: string
  metadata?: Record<string, ApprovalContextValue>
}

function cloneContextValue(
  value: ApprovalContextValue
): ApprovalContextValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneContextValue))
  }

  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          cloneContextValue(item),
        ])
      )
    )
  }

  assertApprovalDomain(
    value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean",
    "invalid_input",
    "ApprovalContext aceita apenas valores serializáveis."
  )

  return value
}

export function createApprovalContext(
  input: CreateApprovalContextInput
): ApprovalContext {
  const metadata = Object.freeze(
    Object.fromEntries(
      Object.entries(input.metadata ?? {}).map(
        ([key, value]) => [key, cloneContextValue(value)]
      )
    )
  )

  return Object.freeze({
    schemaVersion: requireText(
      input.schemaVersion,
      "schemaVersion"
    ),
    summary: requireText(input.summary, "summary"),
    metadata,
  })
}
