import { z } from "zod"

export const createWorkspaceSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
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
