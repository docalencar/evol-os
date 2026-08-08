import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  ConceptVersionCompatibilityInput,
  DevelopmentTemplateVersionActionInput,
  DevelopmentTemplateVersionGoalInput,
  EmployeeCompetencyLevelInput,
  GlobalCompetencyConceptVersionInput,
  OperationalCompetencyInput,
  TenantCompetencyMappingInput,
} from "../resolver"
import type {
  DevelopmentTemplateApplicationIntent,
  DevelopmentTemplateApplicationResolutionRepository,
} from "./ports"

type Row = Record<string, unknown>

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : []
}

async function selectOrThrow(query: PromiseLike<{ data: unknown; error: unknown }>) {
  const { data, error } = await query
  if (error) throw error
  return data
}

export function createSupabaseDevelopmentTemplateApplicationResolutionRepository(
  database: SupabaseClient,
): DevelopmentTemplateApplicationResolutionRepository {
  return {
    async load(applicationIntent: DevelopmentTemplateApplicationIntent) {
      const { companyId } = applicationIntent.identity
      const templateVersion = (await selectOrThrow(
        database
          .from("development_template_versions")
          .select("*")
          .eq("id", applicationIntent.templateVersionId)
          .maybeSingle(),
      )) as Row | null

      const goalRows = rows(
        await selectOrThrow(
          database
            .from("development_template_version_goals")
            .select("*")
            .eq("template_version_id", applicationIntent.templateVersionId)
            .order("order_index")
            .order("created_at")
            .order("id"),
        ),
      )
      const goalIds = goalRows.map((goal) => goal.id as string)
      const actionRows = goalIds.length
        ? rows(
            await selectOrThrow(
              database
                .from("development_template_version_actions")
                .select("*")
                .in("template_version_goal_id", goalIds)
                .order("order_index")
                .order("created_at")
                .order("id"),
            ),
          )
        : []

      const [competencyData, levelData, conceptData, mappingData, compatibilityData] =
        await Promise.all([
          selectOrThrow(database.from("competencies").select("*").eq("company_id", companyId)),
          selectOrThrow(
            database
              .from("employee_competencies")
              .select("*")
              .eq("company_id", companyId)
              .eq("employee_id", applicationIntent.intent.employeeId),
          ),
          selectOrThrow(
            database
              .from("global_competency_concept_versions")
              .select("*, global_competency_concepts!inner(code)"),
          ),
          selectOrThrow(
            database.from("tenant_competency_mappings").select("*").eq("company_id", companyId),
          ),
          selectOrThrow(database.from("global_competency_concept_version_compatibilities").select("*")),
        ])

      const template = templateVersion ?? {}
      return {
        templateVersion: {
          id: applicationIntent.templateVersionId,
          templateId: String(template.template_id ?? ""),
          companyId: typeof template.company_id === "string" ? template.company_id : null,
          scope: template.scope === "global" ? "global" : "company",
          versionNumber: Number(template.version_number ?? 0),
          status: template.status === "published" ? "published" : template.status === "obsolete" ? "obsolete" : "draft",
          name: String(template.name ?? ""),
          description: typeof template.description === "string" ? template.description : null,
          suggestedDurationDays: typeof template.suggested_duration_days === "number" ? template.suggested_duration_days : null,
        },
        goals: goalRows.map((goal) => ({
          id: String(goal.id), templateVersionId: String(goal.template_version_id),
          companyId: typeof goal.company_id === "string" ? goal.company_id : null,
          competencyId: typeof goal.competency_id === "string" ? goal.competency_id : null,
          globalConceptVersionId: typeof goal.global_concept_version_id === "string" ? goal.global_concept_version_id : null,
          description: typeof goal.description === "string" ? goal.description : null,
          suggestedTargetLevel: Number(goal.suggested_target_level), orderIndex: Number(goal.order_index),
          createdAt: String(goal.created_at),
        })) as DevelopmentTemplateVersionGoalInput[],
        actions: actionRows.map((action) => ({
          id: String(action.id), templateVersionGoalId: String(action.template_version_goal_id),
          title: String(action.title), description: typeof action.description === "string" ? action.description : null,
          type: String(action.type), suggestedDueDays: typeof action.suggested_due_days === "number" ? action.suggested_due_days : null,
          orderIndex: Number(action.order_index), createdAt: String(action.created_at),
        })) as DevelopmentTemplateVersionActionInput[],
        operationalCompetencies: rows(competencyData).map((row) => ({
          id: String(row.id), companyId: String(row.company_id), name: String(row.name),
          description: typeof row.description === "string" ? row.description : null,
          expectedLevel: Number(row.expected_level), active: row.active === true,
        })) as OperationalCompetencyInput[],
        employeeCompetencyLevels: rows(levelData).map((row) => ({
          competencyId: String(row.competency_id), currentLevel: Number(row.current_level),
          active: row.archived_at === null,
        })) as EmployeeCompetencyLevelInput[],
        globalConceptVersions: rows(conceptData).map((row) => ({
          id: String(row.id), conceptId: String(row.concept_id),
          conceptCode: String((row.global_competency_concepts as Row | undefined)?.code ?? ""),
          versionNumber: Number(row.version_number), name: String(row.name), definition: String(row.definition),
          category: String(row.category), status: row.status as GlobalCompetencyConceptVersionInput["status"],
        })),
        tenantMappings: rows(mappingData).map((row) => ({
          id: String(row.id), companyId: String(row.company_id), conceptVersionId: String(row.concept_version_id),
          competencyId: String(row.competency_id), status: row.status,
          confirmedBy: typeof row.confirmed_by === "string" ? row.confirmed_by : null,
          confirmedAt: typeof row.confirmed_at === "string" ? row.confirmed_at : null,
        })) as TenantCompetencyMappingInput[],
        compatibilities: rows(compatibilityData).map((row) => ({
          id: String(row.id), requiredVersionId: String(row.required_version_id), compatibleVersionId: String(row.compatible_version_id),
        })) as ConceptVersionCompatibilityInput[],
      }
    },
  }
}
