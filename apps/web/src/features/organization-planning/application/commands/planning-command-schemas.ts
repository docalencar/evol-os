import { z } from "zod"

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
  description: z.string().trim().max(500).nullable().optional(),
  occurredAt,
})

export const createScenarioBranchCommandSchema = z.object({
  companyId: id,
  sourceScenarioId: id,
  scenarioId: id,
  occurredAt,
}).refine(
  (input) => input.sourceScenarioId !== input.scenarioId,
  {
    message: "O novo cenário deve possuir um identificador diferente da origem.",
    path: ["scenarioId"],
  }
)

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
