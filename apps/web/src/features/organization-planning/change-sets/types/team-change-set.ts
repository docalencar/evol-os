import type {
  BasePlanningChangeSet,
} from "./base-change-set"

export type TeamCreatePayload = Readonly<{
  teamId: string
  name: string
  code: string | null
  description: string | null
  departmentId: string
}>

export type TeamUpdatePayload = {
  teamId: string
  name?: string
  code?: string | null
  description?: string | null
  departmentId?: string
}

export type TeamArchivePayload = Readonly<{
  teamId: string
}>

export type TeamCreateChangeSet =
  BasePlanningChangeSet<
    "team.create",
    TeamCreatePayload
  >

export type TeamUpdateChangeSet =
  BasePlanningChangeSet<
    "team.update",
    TeamUpdatePayload
  >

export type TeamArchiveChangeSet =
  BasePlanningChangeSet<
    "team.archive",
    TeamArchivePayload
  >

export type TeamChangeSet =
  | TeamCreateChangeSet
  | TeamUpdateChangeSet
  | TeamArchiveChangeSet
