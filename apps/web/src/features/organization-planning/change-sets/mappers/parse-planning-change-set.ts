import {
  isPlanningChangeType,
  type PersistedPlanningChangeSetRecord,
  type PlanningChangeSet,
} from "../index"
import { payloadParsers } from "./payload-parsers"

function createBaseChangeSet(
  record: PersistedPlanningChangeSetRecord
) {
  return {
    id: record.id,
    companyId: record.company_id,
    scenarioId: record.scenario_id,
    version: record.version,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

export function parsePlanningChangeSet(
  record: PersistedPlanningChangeSetRecord
): PlanningChangeSet {
  if (!isPlanningChangeType(record.change_type)) {
    throw new Error(
      `Unsupported planning change type: ${record.change_type}`
    )
  }

  const base = createBaseChangeSet(record)

  switch (record.change_type) {
    case "department.create":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "department.update":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "department.archive":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "team.create":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "team.update":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "team.archive":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "position.create":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "position.update":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "position.move":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "position.archive":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "employee.create":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "employee.update":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "employee.move":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "employee.terminate":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }

    case "employee.archive":
      return {
        ...base,
        changeType: record.change_type,
        payload: payloadParsers[record.change_type](record.payload),
      }
  }
}
