import { z } from "zod"

import {
  PLANNING_CHANGE_TYPES,
} from "../../change-sets"

const id = z.string().uuid()
const occurredAt = z.date()

export const createWorkspaceCommandSchema = z.object({
  companyId: id,
  workspaceId: id,
  initialSnapshotId: id,
  occurredAt,
})

export const createScenarioCommandSchema = z.object({
  companyId: id,
  scenarioId: id,
  workspaceId: id,
  baseSnapshotId: id,
  name: z.string().trim().min(2).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional(),
  occurredAt,
})

export const createPlanningChangeSetCommandSchema =
  z.object({
    companyId: id,
    changeSetId: id,
    scenarioId: id,
    changeType: z.enum(PLANNING_CHANGE_TYPES),
    payload: z.record(
      z.string(),
      z.unknown()
    ),
    occurredAt,
  })

export const publishScenarioCommandSchema = z.object({
  companyId: id,
  scenarioId: id,
  snapshotId: id,
  expectedVersion: z.number().int().positive(),
  occurredAt,
})

export const archiveScenarioCommandSchema = z.object({
  companyId: id,
  scenarioId: id,
  expectedVersion: z.number().int().positive(),
  occurredAt,
})
