import { z } from "zod"

import {
  POSITION_EMPLOYMENT_TYPES,
  POSITION_HIERARCHICAL_LEVELS,
  POSITION_TRAVEL_REQUIREMENTS,
  POSITION_WORK_MODELS,
} from "../../organization/positions/types/position"
import {
  freezeProjectedOrganization,
  type ProjectedOrganization,
} from "../projection"

const nullableId = z.string().min(1).nullable()
const status = z.enum(["active", "archived"])

const department = z.object({
  id: z.string().min(1),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  parentDepartmentId: nullableId,
  status,
}).strict()

const team = z.object({
  id: z.string().min(1),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  departmentId: nullableId,
  status,
}).strict()

const position = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  departmentId: nullableId,
  hierarchicalLevel: z.enum(POSITION_HIERARCHICAL_LEVELS),
  weeklyWorkloadHours: z.number().finite(),
  workModel: z.enum(POSITION_WORK_MODELS),
  employmentType: z.enum(POSITION_EMPLOYMENT_TYPES),
  travelRequirement: z.enum(POSITION_TRAVEL_REQUIREMENTS),
  status,
}).strict()

const employee = z.object({
  id: z.string().min(1),
  positionId: nullableId,
  departmentId: nullableId.optional(),
  teamId: nullableId.optional(),
  status: status.optional(),
}).strict()

const vacancy = z.object({
  id: z.string().min(1),
  positionId: nullableId,
  departmentId: nullableId.optional(),
  teamId: nullableId.optional(),
  status: status.optional(),
}).strict()

const metrics = z.object({
  headcount: z.number().finite(),
  vacancies: z.number().finite(),
  salaryMass: z.number().finite(),
  departments: z.number().finite(),
  positions: z.number().finite(),
}).strict()

const projectedOrganization = z.object({
  departments: z.array(department),
  teams: z.array(team),
  positions: z.array(position),
  employees: z.array(employee),
  vacancies: z.array(vacancy),
  metrics,
}).strict()

export function parseProjectedOrganization(
  value: unknown
): ProjectedOrganization {
  const result = projectedOrganization.safeParse(value)

  if (!result.success) {
    throw new Error("PLANNING_PROJECTED_ORGANIZATION_INVALID_DATA", {
      cause: result.error,
    })
  }

  return freezeProjectedOrganization(result.data)
}
