import type {
  BasePlanningChangeSet,
} from "./base-change-set"

type PositionData = {
  title: string
  code: string | null
  departmentId: string
  teamId: string | null
  reportsToPositionId: string | null
}

export type PositionCreatePayload = PositionData

export type PositionUpdatePayload = PositionData

export type PositionMovePayload = {
  departmentId: string
  teamId: string | null
  reportsToPositionId: string | null
}

export type PositionArchivePayload = {
  reason?: string
}

export type PositionCreateChangeSet =
  BasePlanningChangeSet<
    "position.create",
    PositionCreatePayload
  >

export type PositionUpdateChangeSet =
  BasePlanningChangeSet<
    "position.update",
    PositionUpdatePayload
  >

export type PositionMoveChangeSet =
  BasePlanningChangeSet<
    "position.move",
    PositionMovePayload
  >

export type PositionArchiveChangeSet =
  BasePlanningChangeSet<
    "position.archive",
    PositionArchivePayload
  >

export type PositionChangeSet =
  | PositionCreateChangeSet
  | PositionUpdateChangeSet
  | PositionMoveChangeSet
  | PositionArchiveChangeSet
