import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

/**
 * The single write path for company template authoring.
 *
 * Every operation is a named trusted function from 0131. Nothing here selects
 * or writes a template table directly — 0131 revoked those privileges from
 * `authenticated`, and the point of that revoke is that authoring authority is
 * decided in the database, not by whichever client happens to call.
 *
 * Deliberately absent, because D-P0 gives them no trusted replacement:
 *
 *   - editing a published version's content or metadata. A published version is
 *     immutable; the lifecycle answer is a new draft, not an update.
 *   - deleting a draft goal or action. Draft construction is additive by
 *     contract, and no active surface ever called the legacy delete.
 *
 * Identities are never interchangeable here. `templateVersionId` addresses a
 * version, `templateVersionGoalId` addresses a goal inside one, and neither is
 * the legacy container id the route is keyed on.
 */

/**
 * Boundary failures arrive as PostgREST error objects, not as `Error`, and they
 * carry the database's own text. Translating here — once, on the way out — is
 * what keeps every caller working in the closed product vocabulary instead of
 * pattern-matching SQL messages, and what stops a SQLSTATE or a function name
 * reaching the browser.
 *
 * 0131 raises named messages of its own; anything unrecognised becomes the
 * generic failure rather than being forwarded.
 */
const BOUNDARY_FAILURES = new Set<string>([
  "DEVELOPMENT_TEMPLATE_FORBIDDEN",
  "DEVELOPMENT_TEMPLATE_INVALID",
  "DEVELOPMENT_TEMPLATE_NOT_FOUND",
  "DEVELOPMENT_TEMPLATE_GOAL_NOT_FOUND",
  "DEVELOPMENT_TEMPLATE_IMMUTABLE",
  "DEVELOPMENT_TEMPLATE_TRANSITION_INVALID",
  "DEVELOPMENT_TEMPLATE_CONTENT_INCOMPLETE",
  "DEVELOPMENT_TEMPLATE_GOAL_INVALID",
  "DEVELOPMENT_TEMPLATE_ACTION_INVALID",
  "DEVELOPMENT_TEMPLATE_IDEMPOTENCY_CONFLICT",
])

function boundaryError(error: unknown): Error {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : ""
  return new Error(
    BOUNDARY_FAILURES.has(message) ? message : "DEVELOPMENT_TEMPLATE_OPERATION_FAILED"
  )
}

export type CreateDevelopmentTemplateDraftInput = {
  companyId: string
  name: string
  description?: string | null
  suggestedDurationDays?: number | null
  idempotencyKey: string
}

export type AddDevelopmentTemplateGoalInput = {
  templateVersionId: string
  competencyId: string
  description?: string | null
  suggestedTargetLevel: number
  orderIndex: number
}

export type AddDevelopmentTemplateActionInput = {
  templateVersionGoalId: string
  title: string
  description?: string | null
  type: string
  suggestedDueDays?: number | null
  orderIndex: number
}

export async function createDevelopmentTemplateAuthoringRepository() {
  const database = await createServerDatabase()

  return {
    /** Returns the VERSION id — the container is created as a side effect. */
    async createDraft(
      input: CreateDevelopmentTemplateDraftInput
    ): Promise<{ templateVersionId: string }> {
      const { data, error } = await database.rpc("create_development_template_draft_v1", {
        p_company_id: input.companyId,
        p_name: input.name,
        p_description: input.description ?? null,
        p_duration: input.suggestedDurationDays ?? null,
        p_idempotency_key: input.idempotencyKey,
      })
      if (error) throw boundaryError(error)
      const templateVersionId = data as string | null
      if (!templateVersionId) throw new Error("DEVELOPMENT_TEMPLATE_DRAFT_NOT_CREATED")
      return { templateVersionId }
    },

    async addGoal(
      input: AddDevelopmentTemplateGoalInput
    ): Promise<{ templateVersionGoalId: string }> {
      const { data, error } = await database.rpc("add_development_template_goal_v1", {
        p_version_id: input.templateVersionId,
        p_competency_id: input.competencyId,
        p_description: input.description ?? null,
        p_target: input.suggestedTargetLevel,
        p_order: input.orderIndex,
      })
      if (error) throw boundaryError(error)
      const templateVersionGoalId = data as string | null
      if (!templateVersionGoalId) throw new Error("DEVELOPMENT_TEMPLATE_GOAL_NOT_CREATED")
      return { templateVersionGoalId }
    },

    async addAction(
      input: AddDevelopmentTemplateActionInput
    ): Promise<{ templateVersionActionId: string }> {
      const { data, error } = await database.rpc("add_development_template_action_v1", {
        p_goal_id: input.templateVersionGoalId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_type: input.type,
        p_due_days: input.suggestedDueDays ?? null,
        p_order: input.orderIndex,
      })
      if (error) throw boundaryError(error)
      const templateVersionActionId = data as string | null
      if (!templateVersionActionId) throw new Error("DEVELOPMENT_TEMPLATE_ACTION_NOT_CREATED")
      return { templateVersionActionId }
    },

    /**
     * `p_expected_revision` is a conflict guard, not a formality: every added
     * goal and action bumps the version's revision, so a stale authoring page
     * publishing what it last saw is refused rather than silently publishing a
     * different draft.
     */
    async publish(templateVersionId: string, expectedRevision: number): Promise<void> {
      const { error } = await database.rpc("publish_development_template_version_v1", {
        p_version_id: templateVersionId,
        p_expected_revision: expectedRevision,
      })
      if (error) throw boundaryError(error)
    },

    async obsolete(templateVersionId: string): Promise<void> {
      const { error } = await database.rpc("obsolete_development_template_version_v1", {
        p_version_id: templateVersionId,
      })
      if (error) throw boundaryError(error)
    },
  }
}
