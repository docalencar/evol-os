import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  CreatePositionRequirementInput,
  UpdatePositionRequirementInput,
} from "../schemas/position-requirement-schema"

function normalizeInput(
  input:
    | CreatePositionRequirementInput
    | UpdatePositionRequirementInput
) {
  return {
    position_id:
      input.positionId,

    category:
      input.category,

    value:
      input.value,

    required:
      input.required,

    notes:
      input.notes || null,

    updated_at:
      new Date().toISOString(),
  }
}

export async function createPositionRequirementRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findAll(
      companyId: string
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .is(
          "archived_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
    },

    async findByPosition(
      companyId: string,
      positionId: string
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "position_id",
          positionId
        )
        .is(
          "archived_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
    },

    async findById(
      companyId: string,
      positionRequirementId: string
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          positionRequirementId
        )
        .is(
          "archived_at",
          null
        )
        .single()
    },

    async create(
      companyId: string,
      input: CreatePositionRequirementInput
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .insert({
          company_id:
            companyId,

          ...normalizeInput(
            input
          ),
        })
    },

    async update(
      companyId: string,
      positionRequirementId: string,
      input: UpdatePositionRequirementInput
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .update(
          normalizeInput(
            input
          )
        )
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          positionRequirementId
        )
        .is(
          "archived_at",
          null
        )
    },

    async archive(
      companyId: string,
      positionRequirementId: string
    ) {
      return supabase
        .from(
          "position_requirements"
        )
        .update({
          archived_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          positionRequirementId
        )
        .is(
          "archived_at",
          null
        )
    },
  }
}