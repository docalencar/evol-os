import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type {
  ProjectionApplicationRepository,
} from "../application/ports"
import {
  freezeProjectedOrganization,
  PROJECTION_STATUSES,
  type ProjectedOrganization,
  type ProjectionContract,
  type ProjectionIssue,
  type ProjectionManifest,
  type ProjectionMetrics,
  type ProjectionStatus,
} from "../projection"

type ProjectionDatabase =
  Awaited<
    ReturnType<
      typeof createServerDatabase
    >
  >

type ProjectionManifestRow =
  Readonly<{
    projectionVersion: number
    engineVersion: string
    schemaVersion: string
    changeSetCount: number
    executedChangeSets: number
    warningCount: number
    errorCount: number
    durationMs: number
    generatedAt: string
  }>

type ProjectionRow =
  Readonly<{
    id: string
    company_id: string
    workspace_id: string
    scenario_id: string
    source_snapshot_id: string
    version: number
    status: string
    organization: unknown
    metrics: unknown
    warnings: unknown
    errors: unknown
    manifest: unknown
    created_at: string
    updated_at: string
  }>

function requireRecord(
  value: unknown,
  field: string
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `O campo ${field} da projeção é inválido.`
    )
  }

  return value as Record<
    string,
    unknown
  >
}

function requireString(
  value: unknown,
  field: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `O campo ${field} da projeção é inválido.`
    )
  }

  return value
}

function requireNumber(
  value: unknown,
  field: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `O campo ${field} da projeção é inválido.`
    )
  }

  return value
}

function parseDate(
  value: string,
  field: string
): Date {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `O campo ${field} da projeção é inválido.`
    )
  }

  return date
}

function parseStatus(
  status: string
): ProjectionStatus {
  if (
    !PROJECTION_STATUSES.includes(
      status as ProjectionStatus
    )
  ) {
    throw new Error(
      `O status ${status} da projeção é inválido.`
    )
  }

  return status as ProjectionStatus
}

function parseMetrics(
  value: unknown
): ProjectionMetrics {
  const metrics =
    requireRecord(
      value,
      "metrics"
    )

  return Object.freeze({
    headcount:
      requireNumber(
        metrics.headcount,
        "metrics.headcount"
      ),
    vacancies:
      requireNumber(
        metrics.vacancies,
        "metrics.vacancies"
      ),
    salaryMass:
      requireNumber(
        metrics.salaryMass,
        "metrics.salaryMass"
      ),
    departments:
      requireNumber(
        metrics.departments,
        "metrics.departments"
      ),
    positions:
      requireNumber(
        metrics.positions,
        "metrics.positions"
      ),
  })
}

function parseIssues(
  value: unknown,
  field:
    | "warnings"
    | "errors"
): readonly ProjectionIssue[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      `O campo ${field} da projeção é inválido.`
    )
  }

  return Object.freeze(
    value.map(
      (
        item,
        index
      ) => {
        const issue =
          requireRecord(
            item,
            `${field}[${index}]`
          )

        const changeSetId =
          issue.changeSetId ===
          undefined
            ? undefined
            : requireString(
                issue.changeSetId,
                `${field}[${index}].changeSetId`
              )

        return Object.freeze({
          code:
            requireString(
              issue.code,
              `${field}[${index}].code`
            ),
          message:
            requireString(
              issue.message,
              `${field}[${index}].message`
            ),
          ...(changeSetId
            ? {
                changeSetId,
              }
            : {}),
        })
      }
    )
  )
}

function parseOrganization(
  value: unknown
): ProjectedOrganization {
  const organization =
    requireRecord(
      value,
      "organization"
    )

  if (
    !Array.isArray(
      organization.departments
    ) ||
    !Array.isArray(
      organization.teams
    ) ||
    !Array.isArray(
      organization.positions
    ) ||
    !Array.isArray(
      organization.employees
    ) ||
    !Array.isArray(
      organization.vacancies
    )
  ) {
    throw new Error(
      "A organização persistida na projeção é inválida."
    )
  }

  return freezeProjectedOrganization({
    departments:
      organization.departments as
        ProjectedOrganization["departments"],
    teams:
      organization.teams as
        ProjectedOrganization["teams"],
    positions:
      organization.positions as
        ProjectedOrganization["positions"],
    employees:
      organization.employees as
        ProjectedOrganization["employees"],
    vacancies:
      organization.vacancies as
        ProjectedOrganization["vacancies"],
    metrics:
      parseMetrics(
        organization.metrics
      ),
  })
}

function parseManifest(
  value: unknown
): ProjectionManifest {
  const manifest =
    requireRecord(
      value,
      "manifest"
    )

  return Object.freeze({
    projectionVersion:
      requireNumber(
        manifest.projectionVersion,
        "manifest.projectionVersion"
      ),
    engineVersion:
      requireString(
        manifest.engineVersion,
        "manifest.engineVersion"
      ),
    schemaVersion:
      requireString(
        manifest.schemaVersion,
        "manifest.schemaVersion"
      ),
    changeSetCount:
      requireNumber(
        manifest.changeSetCount,
        "manifest.changeSetCount"
      ),
    executedChangeSets:
      requireNumber(
        manifest.executedChangeSets,
        "manifest.executedChangeSets"
      ),
    warningCount:
      requireNumber(
        manifest.warningCount,
        "manifest.warningCount"
      ),
    errorCount:
      requireNumber(
        manifest.errorCount,
        "manifest.errorCount"
      ),
    durationMs:
      requireNumber(
        manifest.durationMs,
        "manifest.durationMs"
      ),
    generatedAt:
      parseDate(
        requireString(
          manifest.generatedAt,
          "manifest.generatedAt"
        ),
        "manifest.generatedAt"
      ),
  })
}

function serializeManifest(
  manifest:
    ProjectionManifest
): ProjectionManifestRow {
  return Object.freeze({
    projectionVersion:
      manifest.projectionVersion,
    engineVersion:
      manifest.engineVersion,
    schemaVersion:
      manifest.schemaVersion,
    changeSetCount:
      manifest.changeSetCount,
    executedChangeSets:
      manifest.executedChangeSets,
    warningCount:
      manifest.warningCount,
    errorCount:
      manifest.errorCount,
    durationMs:
      manifest.durationMs,
    generatedAt:
      manifest.generatedAt
        .toISOString(),
  })
}

function mapProjection(
  row: ProjectionRow
): ProjectionContract {
  const createdAt =
    parseDate(
      row.created_at,
      "createdAt"
    )

  const updatedAt =
    parseDate(
      row.updated_at,
      "updatedAt"
    )

  return Object.freeze({
    id:
      row.id,
    companyId:
      row.company_id,
    workspaceId:
      row.workspace_id,
    scenarioId:
      row.scenario_id,
    sourceSnapshotId:
      row.source_snapshot_id,
    version:
      row.version,
    status:
      parseStatus(
        row.status
      ),
    organization:
      parseOrganization(
        row.organization
      ),
    metrics:
      parseMetrics(
        row.metrics
      ),
    warnings:
      parseIssues(
        row.warnings,
        "warnings"
      ),
    errors:
      parseIssues(
        row.errors,
        "errors"
      ),
    manifest:
      parseManifest(
        row.manifest
      ),
    createdAt,
    updatedAt,
  })
}

export function createProjectionRepositoryFromDatabase(
  database:
    ProjectionDatabase
): ProjectionApplicationRepository {
  const select = `
    id,
    company_id,
    workspace_id,
    scenario_id,
    source_snapshot_id,
    version,
    status,
    organization,
    metrics,
    warnings,
    errors,
    manifest,
    created_at,
    updated_at
  `

  return {
    async findById(
      companyId: string,
      projectionId: string
    ) {
      const {
        data,
        error,
      } =
        await database
          .from(
            "organization_planning_projections"
          )
          .select(select)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            projectionId
          )
          .maybeSingle()

      if (error) {
        throw new Error(
          error.message
        )
      }

      return data
        ? mapProjection(
            data as ProjectionRow
          )
        : null
    },

    async findLatestByScenario(
      companyId: string,
      scenarioId: string
    ) {
      const {
        data,
        error,
      } =
        await database
          .from(
            "organization_planning_projections"
          )
          .select(select)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "scenario_id",
            scenarioId
          )
          .order(
            "version",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle()

      if (error) {
        throw new Error(
          error.message
        )
      }

      return data
        ? mapProjection(
            data as ProjectionRow
          )
        : null
    },

    async create(
      projection:
        ProjectionContract
    ) {
      const {
        error,
      } =
        await database
          .from(
            "organization_planning_projections"
          )
          .insert({
            id:
              projection.id,
            company_id:
              projection.companyId,
            workspace_id:
              projection.workspaceId,
            scenario_id:
              projection.scenarioId,
            source_snapshot_id:
              projection.sourceSnapshotId,
            version:
              projection.version,
            status:
              projection.status,
            organization:
              projection.organization,
            metrics:
              projection.metrics,
            warnings:
              projection.warnings,
            errors:
              projection.errors,
            manifest:
              serializeManifest(
                projection.manifest
              ),
            created_at:
              projection.createdAt
                .toISOString(),
            updated_at:
              projection.updatedAt
                .toISOString(),
          })

      if (error) {
        throw new Error(
          error.message
        )
      }
    },
  }
}

export async function createProjectionRepository():
Promise<ProjectionApplicationRepository> {
  const database =
    await createServerDatabase()

  return createProjectionRepositoryFromDatabase(
    database
  )
}

export type ProjectionRepository =
  Awaited<
    ReturnType<
      typeof createProjectionRepository
    >
  >
