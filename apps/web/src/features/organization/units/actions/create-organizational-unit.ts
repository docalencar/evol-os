"use server"

import {
  createClient,
} from "@/lib/supabase/supabase/server"

import {
  organizationalUnitSchema,
} from "../schemas/organizational-unit-schema"

import {
  createOrganizationalUnitRepository,
} from "../repositories"


export async function createOrganizationalUnit(
  input: {
    companyId: string

    parentId: string | null

    name: string

    type:
      | "holding"
      | "business_unit"
  }
) {
  const validated =
    organizationalUnitSchema.parse({
      name: input.name,

      parentId:
        input.parentId,

      type:
        input.type,

      status:
        "active",
    })


  const supabase =
    await createClient()


  const repository =
    createOrganizationalUnitRepository(
      supabase
    )


  return repository.create({
    companyId:
      input.companyId,

    parentId:
      validated.parentId,

    name:
      validated.name,

    type:
      validated.type,
  })
}
