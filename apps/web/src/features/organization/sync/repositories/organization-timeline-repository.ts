import "server-only"

import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  ValidatedOrganizationTimelineInput,
} from "../schemas/organization-timeline-schema"

function serializeExecutionReport(
  report: ValidatedOrganizationTimelineInput["report"]
) {
  return {
    startedAt: report.startedAt.toISOString(),
    finishedAt: report.finishedAt.toISOString(),
    duration: report.duration,
    appliedItems: report.appliedItems,
    skippedItems: report.skippedItems,
    failedItems: report.failedItems,
    entitySummary: report.entitySummary,
    operationSummary: report.operationSummary,
    warnings: report.warnings,
    errors: report.errors,
  }
}

export async function createOrganizationTimelineRepository() {
  const supabase = await createServerDatabase()

  return {
    async listByCompany(
      companyId: string
    ) {
      return supabase
        .from("organization_sync_timeline")
        .select(`
          id,
          started_at,
          finished_at,
          duration_ms,
          applied_items,
          skipped_items,
          failed_items,
          created_at
        `)
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        })
    },

    async findById(
      companyId: string,
      executionId: string
    ) {
      return supabase
        .from("organization_sync_timeline")
        .select(`
          id,
          started_at,
          finished_at,
          duration_ms,
          applied_items,
          skipped_items,
          failed_items,
          entity_summary,
          operation_summary,
          warnings,
          errors,
          receipts,
          created_at
        `)
        .eq("company_id", companyId)
        .eq("id", executionId)
        .maybeSingle()
    },

    async create(
      input: ValidatedOrganizationTimelineInput
    ) {
      const report = input.report

      return supabase
        .from("organization_sync_timeline")
        .insert({
          company_id: input.companyId,

          started_at:
            report.startedAt.toISOString(),

          finished_at:
            report.finishedAt.toISOString(),

          duration_ms:
            report.duration,

          applied_items:
            report.appliedItems,

          skipped_items:
            report.skippedItems,

          failed_items:
            report.failedItems,

          entity_summary:
            report.entitySummary,

          operation_summary:
            report.operationSummary,

          warnings:
            report.warnings,

          errors:
            report.errors,

          receipts:
            report.receipts,

          created_by:
            input.createdBy,
        })
        .select("id")
        .single()
    },

    serializeExecutionReport,
  }
}
