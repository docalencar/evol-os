import type {
  BasePlanningChangeSet,
} from "./base-change-set"

export type DepartmentCreatePayload = Readonly<{
  departmentId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
}>

export type DepartmentUpdatePayload = Readonly<{
  departmentId: string
  name?: string
  code?: string | null
  description?: string | null
  parentDepartmentId?: string | null
}>

export type DepartmentArchivePayload = Readonly<{
  departmentId: string
}>

export type DepartmentCreateChangeSet =
  BasePlanningChangeSet<
    "department.create",
    DepartmentCreatePayload
  >

export type DepartmentUpdateChangeSet =
  BasePlanningChangeSet<
    "department.update",
    DepartmentUpdatePayload
  >

export type DepartmentArchiveChangeSet =
  BasePlanningChangeSet<
    "department.archive",
    DepartmentArchivePayload
  >

export type DepartmentChangeSet =
  | DepartmentCreateChangeSet
  | DepartmentUpdateChangeSet
  | DepartmentArchiveChangeSet
