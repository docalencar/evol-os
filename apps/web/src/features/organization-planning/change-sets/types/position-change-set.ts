import type {
  BasePlanningChangeSet,
} from "./base-change-set"


export type PositionCreatePayload = Readonly<{
  positionId: string
  title: string
  code: string | null
  departmentId: string
  teamId: string | null
  hierarchicalLevel: string | null
  reportsToPositionId: string | null
}>


export type PositionUpdatePayload = Readonly<{
  positionId: string
  title?: string
  code?: string | null
  departmentId?: string
  teamId?: string | null
  hierarchicalLevel?: string | null
  reportsToPositionId?: string | null
}>


export type PositionMovePayload = Readonly<{
  positionId: string
  fromDepartmentId: string
  toDepartmentId: string
  fromTeamId: string | null
  toTeamId: string | null
}>


export type PositionArchivePayload = Readonly<{
  positionId: string
}>


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
