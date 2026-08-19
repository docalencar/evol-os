import { createServerDatabase } from "@/lib/database/server-database"
import { intentKey } from "@/features/people-organization-mutations/idempotency"

import type {
  CreateCompetencyInput,
  UpdateCompetencyInput,
} from "../schemas/competency-schema"

export async function createCompetencyRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("competencies")
        .select("*")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name", { ascending: true })
    },

    async findById(companyId: string, competencyId: string) {
      return supabase
        .from("competencies")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", competencyId)
        .single()
    },

    async create(
      companyId: string,
      input: CreateCompetencyInput,
      submissionId: string
    ) {
      // Trusted mutation boundary (migration 0099): authorizes the actor
      // (owner/admin/hr) from auth.uid(), validates the tenant, persists the
      // competency as active and records the activity atomically. No direct
      // protected DML in the create path. The idempotency key is derived
      // server-side from the stable per-submission id via the shared intentKey
      // helper (same pattern as People/Organization); the submission id is a
      // selector only, never authority.
      return supabase.rpc("create_tenant_competency_v1", {
        p_company_id: companyId,
        p_name: input.name,
        p_description: input.description || null,
        p_category: input.category,
        p_expected_level: input.expectedLevel,
        p_weight: input.weight,
        p_idempotency_key: intentKey("competency:create", companyId, submissionId),
      })
    },

    async update(
      companyId: string,
      competencyId: string,
      input: UpdateCompetencyInput
    ) {
      // Trusted mutation boundary (migration 0099). Only the catalog fields are
      // forwarded; `active` is intentionally NOT sent — archiving is the
      // dedicated archive boundary, not a generic update.
      return supabase.rpc("update_tenant_competency_v1", {
        p_company_id: companyId,
        p_competency_id: competencyId,
        p_name: input.name,
        p_description: input.description || null,
        p_category: input.category,
        p_expected_level: input.expectedLevel,
        p_weight: input.weight,
      })
    },

    async archive(companyId: string, competencyId: string) {
      // Trusted mutation boundary (migration 0099): soft archive via active=false,
      // idempotent (already_archived), assignments untouched. No direct DML.
      return supabase.rpc("archive_tenant_competency_v1", {
        p_company_id: companyId,
        p_competency_id: competencyId,
      })
    },
  }
}
