import { z } from "zod"

import { INITIAL_PLANNING_SNAPSHOT_VERSION } from "../types/planning-contracts"

export const createWorkspaceSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  initialSnapshotId: z.string().uuid(),
  allocatedInitialSnapshotVersion: z.literal(
    INITIAL_PLANNING_SNAPSHOT_VERSION
  ),
  createdAt: z.date(),
})

export const createScenarioSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  baseSnapshotId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  createdAt: z.date(),
})

export const scenarioIdSchema = z.object({
  companyId: z.string().uuid(),
  scenarioId: z.string().uuid(),
})

export const snapshotIdSchema = z.object({
  companyId: z.string().uuid(),
  snapshotId: z.string().uuid(),
})

export const companyPlanningSchema = z.object({
  companyId: z.string().uuid(),
})

export type CreateWorkspaceInput = z.input<
  typeof createWorkspaceSchema
>
export type CreateScenarioInput = z.input<
  typeof createScenarioSchema
>
