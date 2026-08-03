import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  DevelopmentTemplateApplicationHistoryRepository,
  DevelopmentTemplateApplicationRepository,
  DevelopmentTemplateVersionRepository,
} from "./contracts"
import type {
  DevelopmentTemplateApplication,
  DevelopmentTemplateApplicationAttempt,
  DevelopmentTemplateApplicationLineage,
  DevelopmentTemplateApplicationSnapshot,
  DevelopmentTemplateVersion,
  DevelopmentTemplateVersionAction,
  DevelopmentTemplateVersionGoal,
  JsonObject,
} from "./types"

type DatabaseRow = Record<string, unknown>

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function requiredString(row: DatabaseRow, key: string): string {
  const value = row[key]
  if (typeof value !== "string") {
    throw new TypeError(`Invalid ${key}`)
  }
  return value
}

function requiredNumber(row: DatabaseRow, key: string): number {
  const value = row[key]
  if (typeof value !== "number") {
    throw new TypeError(`Invalid ${key}`)
  }
  return value
}

function requiredObject(row: DatabaseRow, key: string): JsonObject {
  const value = row[key]
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new TypeError(`Invalid ${key}`)
  }
  return value as JsonObject
}

function toTemplateVersion(row: DatabaseRow): DevelopmentTemplateVersion {
  return {
    id: requiredString(row, "id"),
    templateId: requiredString(row, "template_id"),
    companyId: nullableString(row.company_id),
    scope: requiredString(row, "scope") as DevelopmentTemplateVersion["scope"],
    versionNumber: requiredNumber(row, "version_number"),
    status: requiredString(row, "status") as DevelopmentTemplateVersion["status"],
    name: requiredString(row, "name"),
    description: nullableString(row.description),
    suggestedDurationDays:
      typeof row.suggested_duration_days === "number"
        ? row.suggested_duration_days
        : null,
    createdBy: requiredString(row, "created_by"),
    createdAt: requiredString(row, "created_at"),
    publishedBy: nullableString(row.published_by),
    publishedAt: nullableString(row.published_at),
    obsoletedBy: nullableString(row.obsoleted_by),
    obsoletedAt: nullableString(row.obsoleted_at),
  }
}

function toVersionGoal(row: DatabaseRow): DevelopmentTemplateVersionGoal {
  return {
    id: requiredString(row, "id"),
    templateVersionId: requiredString(row, "template_version_id"),
    sourceGoalId: nullableString(row.source_goal_id),
    companyId: nullableString(row.company_id),
    competencyId: nullableString(row.competency_id),
    globalConceptVersionId: nullableString(row.global_concept_version_id),
    description: nullableString(row.description),
    suggestedTargetLevel: requiredNumber(row, "suggested_target_level"),
    orderIndex: requiredNumber(row, "order_index"),
  }
}

function toVersionAction(row: DatabaseRow): DevelopmentTemplateVersionAction {
  return {
    id: requiredString(row, "id"),
    templateVersionGoalId: requiredString(row, "template_version_goal_id"),
    sourceActionId: nullableString(row.source_action_id),
    title: requiredString(row, "title"),
    description: nullableString(row.description),
    type: requiredString(row, "type"),
    suggestedDueDays:
      typeof row.suggested_due_days === "number" ? row.suggested_due_days : null,
    orderIndex: requiredNumber(row, "order_index"),
  }
}

function toApplication(row: DatabaseRow): DevelopmentTemplateApplication {
  return {
    id: requiredString(row, "id"),
    companyId: requiredString(row, "company_id"),
    templateVersionId: requiredString(row, "template_version_id"),
    actorUserId: requiredString(row, "actor_user_id"),
    technicalPrincipal: requiredString(row, "technical_principal"),
    idempotencyKey: requiredString(row, "idempotency_key"),
    intentFingerprint: requiredString(row, "intent_fingerprint"),
    correlationId: requiredString(row, "correlation_id"),
    status: requiredString(row, "status") as DevelopmentTemplateApplication["status"],
    resultPlanId: nullableString(row.result_plan_id),
    failureCode: nullableString(row.failure_code),
    requestedAt: requiredString(row, "requested_at"),
    completedAt: nullableString(row.completed_at),
  }
}

function toAttempt(row: DatabaseRow): DevelopmentTemplateApplicationAttempt {
  return {
    id: requiredString(row, "id"),
    applicationId: requiredString(row, "application_id"),
    companyId: requiredString(row, "company_id"),
    attemptNumber: requiredNumber(row, "attempt_number"),
    status: requiredString(row, "status") as DevelopmentTemplateApplicationAttempt["status"],
    errorCode: nullableString(row.error_code),
    startedAt: requiredString(row, "started_at"),
    completedAt: nullableString(row.completed_at),
  }
}

function toSnapshot(row: DatabaseRow): DevelopmentTemplateApplicationSnapshot {
  return {
    id: requiredString(row, "id"),
    applicationId: requiredString(row, "application_id"),
    companyId: requiredString(row, "company_id"),
    planId: requiredString(row, "plan_id"),
    formatVersion: requiredNumber(row, "format_version"),
    snapshot: requiredObject(row, "snapshot"),
    createdAt: requiredString(row, "created_at"),
  }
}

function toLineage(row: DatabaseRow): DevelopmentTemplateApplicationLineage {
  return {
    id: requiredString(row, "id"),
    applicationId: requiredString(row, "application_id"),
    snapshotId: requiredString(row, "snapshot_id"),
    planId: requiredString(row, "plan_id"),
    templateVersionId: requiredString(row, "template_version_id"),
    companyId: requiredString(row, "company_id"),
    createdAt: requiredString(row, "created_at"),
  }
}

export function createDevelopmentTemplateVersionRepository(
  database: SupabaseClient,
): DevelopmentTemplateVersionRepository {
  return {
    async findPublishedById(id) {
      const { data, error } = await database
        .from("development_template_versions")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle()
      if (error) throw error
      return data ? toTemplateVersion(data) : null
    },
    async listGoals(templateVersionId) {
      const { data, error } = await database
        .from("development_template_version_goals")
        .select("*")
        .eq("template_version_id", templateVersionId)
        .order("order_index")
        .order("created_at")
        .order("id")
      if (error) throw error
      return (data ?? []).map(toVersionGoal)
    },
    async listActions(templateVersionGoalIds) {
      if (templateVersionGoalIds.length === 0) return []
      const { data, error } = await database
        .from("development_template_version_actions")
        .select("*")
        .in("template_version_goal_id", [...templateVersionGoalIds])
        .order("order_index")
        .order("created_at")
        .order("id")
      if (error) throw error
      return (data ?? []).map(toVersionAction)
    },
  }
}

export function createDevelopmentTemplateApplicationRepository(
  database: SupabaseClient,
): DevelopmentTemplateApplicationRepository {
  return {
    async findById(companyId, applicationId) {
      const { data, error } = await database
        .from("development_template_applications")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", applicationId)
        .maybeSingle()
      if (error) throw error
      return data ? toApplication(data) : null
    },
    async findByIdempotencyKey(companyId, idempotencyKey) {
      const { data, error } = await database
        .from("development_template_applications")
        .select("*")
        .eq("company_id", companyId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle()
      if (error) throw error
      return data ? toApplication(data) : null
    },
    async listAttempts(companyId, applicationId) {
      const { data, error } = await database
        .from("development_template_application_attempts")
        .select("*")
        .eq("company_id", companyId)
        .eq("application_id", applicationId)
        .order("attempt_number")
      if (error) throw error
      return (data ?? []).map(toAttempt)
    },
  }
}

export function createDevelopmentTemplateApplicationHistoryRepository(
  database: SupabaseClient,
): DevelopmentTemplateApplicationHistoryRepository {
  return {
    async findSnapshot(companyId, applicationId) {
      const { data, error } = await database
        .from("development_template_application_snapshots")
        .select("*")
        .eq("company_id", companyId)
        .eq("application_id", applicationId)
        .maybeSingle()
      if (error) throw error
      return data ? toSnapshot(data) : null
    },
    async findLineage(companyId, applicationId) {
      const { data, error } = await database
        .from("development_template_application_lineage")
        .select("*")
        .eq("company_id", companyId)
        .eq("application_id", applicationId)
        .maybeSingle()
      if (error) throw error
      return data ? toLineage(data) : null
    },
  }
}
