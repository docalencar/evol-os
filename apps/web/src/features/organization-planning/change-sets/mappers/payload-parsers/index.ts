import type {
  PlanningChangeSetPayloadByType,
  PlanningChangeType,
} from "../../index"
import { parseDepartmentPayload } from "./parse-department-payload"
import { parseEmployeePayload } from "./parse-employee-payload"
import { parsePositionPayload } from "./parse-position-payload"
import { parseTeamPayload } from "./parse-team-payload"

type PlanningPayloadParserRegistry = {
  [TChangeType in PlanningChangeType]: (
    payload: unknown
  ) => PlanningChangeSetPayloadByType[TChangeType]
}

export const payloadParsers = {
  "department.create": (payload: unknown) =>
    parseDepartmentPayload("department.create", payload),

  "department.update": (payload: unknown) =>
    parseDepartmentPayload("department.update", payload),

  "department.archive": (payload: unknown) =>
    parseDepartmentPayload("department.archive", payload),

  "team.create": (payload: unknown) =>
    parseTeamPayload("team.create", payload),

  "team.update": (payload: unknown) =>
    parseTeamPayload("team.update", payload),

  "team.archive": (payload: unknown) =>
    parseTeamPayload("team.archive", payload),

  "position.create": (payload: unknown) =>
    parsePositionPayload("position.create", payload),

  "position.update": (payload: unknown) =>
    parsePositionPayload("position.update", payload),

  "position.move": (payload: unknown) =>
    parsePositionPayload("position.move", payload),

  "position.archive": (payload: unknown) =>
    parsePositionPayload("position.archive", payload),

  "employee.create": (payload: unknown) =>
    parseEmployeePayload("employee.create", payload),

  "employee.update": (payload: unknown) =>
    parseEmployeePayload("employee.update", payload),

  "employee.move": (payload: unknown) =>
    parseEmployeePayload("employee.move", payload),

  "employee.terminate": (payload: unknown) =>
    parseEmployeePayload("employee.terminate", payload),

  "employee.archive": (payload: unknown) =>
    parseEmployeePayload("employee.archive", payload),
} satisfies PlanningPayloadParserRegistry

export { parseDepartmentPayload } from "./parse-department-payload"
export { parseEmployeePayload } from "./parse-employee-payload"
export { parsePositionPayload } from "./parse-position-payload"
export { parseTeamPayload } from "./parse-team-payload"
