import {
  optionalText,
  requireText,
} from "./shared"

export type ApprovalSubjectRef = Readonly<{
  companyId: string
  module: string
  entityType: string
  entityId: string
  entityVersion: string
  snapshotFingerprint: string | null
}>

export type CreateApprovalSubjectRefInput = {
  companyId: string
  module: string
  entityType: string
  entityId: string
  entityVersion: string
  snapshotFingerprint?: string | null
}

export function createApprovalSubjectRef(
  input: CreateApprovalSubjectRefInput
): ApprovalSubjectRef {
  return Object.freeze({
    companyId: requireText(input.companyId, "companyId"),
    module: requireText(input.module, "module"),
    entityType: requireText(input.entityType, "entityType"),
    entityId: requireText(input.entityId, "entityId"),
    entityVersion: requireText(
      input.entityVersion,
      "entityVersion"
    ),
    snapshotFingerprint: optionalText(
      input.snapshotFingerprint
    ),
  })
}

export function isSameApprovalSubject(
  left: ApprovalSubjectRef,
  right: ApprovalSubjectRef
): boolean {
  return (
    left.companyId === right.companyId &&
    left.module === right.module &&
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.entityVersion === right.entityVersion
  )
}
