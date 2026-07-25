import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { PublishedSnapshot } from "../domain/published-snapshot"
import {
  createOrganizationSnapshotBuilder,
  parseOrganizationSnapshot,
  serializeOrganizationSnapshot,
  type OrganizationSnapshot,
  type OrganizationSnapshotBuilder,
} from "../snapshot"

type SnapshotRow = {
  id: string
  company_id: string
  workspace_id: string
  source_scenario_id: string | null
  version: number
  published_at: string
  organization_data: unknown | null
}

export type StoredPublishedSnapshot = Readonly<{
  snapshot: PublishedSnapshot
  organization: OrganizationSnapshot
}>

type SnapshotRepositoryDependencies = Readonly<{
  organizationSnapshotBuilder?: OrganizationSnapshotBuilder
}>

function mapSnapshotMetadata(
  row: SnapshotRow
) {
  return PublishedSnapshot.restore({
    id: row.id,
    companyId: row.company_id,
    workspaceId: row.workspace_id,
    sourceScenarioId: row.source_scenario_id,
    version: row.version,
    publishedAt: new Date(row.published_at),
  })
}

function mapStoredSnapshot(
  row: SnapshotRow
): StoredPublishedSnapshot {
  if (row.organization_data === null) {
    throw new Error(
      `O snapshot ${row.id} não possui conteúdo organizacional.`
    )
  }

  return Object.freeze({
    snapshot: mapSnapshotMetadata(row),
    organization: parseOrganizationSnapshot(
      row.organization_data
    ),
  })
}

export async function createSnapshotRepository(
  dependencies: SnapshotRepositoryDependencies = {}
) {
  const database = await createServerDatabase()

  const organizationSnapshotBuilder =
    dependencies.organizationSnapshotBuilder ??
    (await createOrganizationSnapshotBuilder())

  const select = `
    id,
    company_id,
    workspace_id,
    source_scenario_id,
    version,
    published_at,
    organization_data
  `

  async function insertSnapshot(
    snapshot: PublishedSnapshot,
    organization: OrganizationSnapshot
  ) {
    const value = snapshot.toContract()
    const organizationData =
      serializeOrganizationSnapshot(
        organization
      )

    const { error } = await database
      .from("organization_planning_snapshots")
      .insert({
        id: value.id,
        company_id: value.companyId,
        workspace_id: value.workspaceId,
        source_scenario_id:
          value.sourceScenarioId,
        version: value.version,
        published_at:
          value.publishedAt.toISOString(),
        organization_data:
          organizationData,
      })

    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    async findAllByCompany(
      companyId: string
    ) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .order("published_at", {
          ascending: false,
        })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map((row) =>
        mapSnapshotMetadata(
          row as SnapshotRow
        )
      )
    },

    async findById(
      companyId: string,
      snapshotId: string
    ) {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data
        ? mapSnapshotMetadata(
            data as SnapshotRow
          )
        : null
    },

    async findStoredById(
      companyId: string,
      snapshotId: string
    ): Promise<StoredPublishedSnapshot | null> {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select(select)
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data
        ? mapStoredSnapshot(
            data as SnapshotRow
          )
        : null
    },

    async findOrganizationById(
      companyId: string,
      snapshotId: string
    ): Promise<OrganizationSnapshot | null> {
      const { data, error } = await database
        .from("organization_planning_snapshots")
        .select("id, organization_data")
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        return null
      }

      if (data.organization_data === null) {
        throw new Error(
          `O snapshot ${snapshotId} não possui conteúdo organizacional.`
        )
      }

      return parseOrganizationSnapshot(
        data.organization_data
      )
    },

    async create(
      snapshot: PublishedSnapshot
    ) {
      const organization =
        await organizationSnapshotBuilder.build(
          snapshot.companyId
        )

      await insertSnapshot(
        snapshot,
        organization
      )
    },

    async createWithOrganization(
      snapshot: PublishedSnapshot,
      organization: OrganizationSnapshot
    ) {
      await insertSnapshot(
        snapshot,
        organization
      )
    },

    async attachOrganization(
      companyId: string,
      snapshotId: string,
      organization: OrganizationSnapshot
    ) {
      const organizationData =
        serializeOrganizationSnapshot(
          organization
        )

      const { data, error } = await database
        .from("organization_planning_snapshots")
        .update({
          organization_data:
            organizationData,
        })
        .eq("company_id", companyId)
        .eq("id", snapshotId)
        .is("organization_data", null)
        .select("id")
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error(
          "SNAPSHOT_ORGANIZATION_ALREADY_ATTACHED"
        )
      }
    },
  }
}

export type SnapshotRepository = Awaited<
  ReturnType<
    typeof createSnapshotRepository
  >
>
