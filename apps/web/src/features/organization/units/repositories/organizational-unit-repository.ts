import type {
  SupabaseClient,
} from "@supabase/supabase-js"


type CreateOrganizationalUnitInput = {
  companyId: string

  parentId: string | null

  name: string

  type:
    | "holding"
    | "business_unit"
}


export function createOrganizationalUnitRepository(
  supabase: SupabaseClient
) {
  return {

    async list(
      companyId: string
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_units"
          )
          .select("*")
          .eq(
            "company_id",
            companyId
          )
          .is(
            "deleted_at",
            null
          )
          .order(
            "name"
          )


      if (error) {
        throw error
      }


      return data
    },


    async create(
      input: CreateOrganizationalUnitInput
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_units"
          )
          .insert({
            company_id:
              input.companyId,

            parent_id:
              input.parentId,

            name:
              input.name,

            type:
              input.type,
          })
          .select()
          .single()


      if (error) {
        throw error
      }


      return data
    },


    async update(
      id: string,
      input: Partial<CreateOrganizationalUnitInput>
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "organization_units"
          )
          .update({
            parent_id:
              input.parentId,

            name:
              input.name,

            type:
              input.type,
          })
          .eq(
            "id",
            id
          )
          .select()
          .single()


      if (error) {
        throw error
      }


      return data
    },


    async remove(
      id: string
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "organization_units"
          )
          .update({
            deleted_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            id
          )


      if (error) {
        throw error
      }
    },

  }
}