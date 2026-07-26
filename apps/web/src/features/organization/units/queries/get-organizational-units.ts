import {
  createClient,
} from "@/lib/supabase/supabase/server"

import {
  createOrganizationalUnitRepository,
} from "../repositories"


export async function getOrganizationalUnits(
  companyId: string
) {
  const supabase =
    await createClient()


  const repository =
    createOrganizationalUnitRepository(
      supabase
    )


  return repository.list(
    companyId
  )
}
