import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createPeopleAccessStateRepository } from "../repositories/people-access-state-repository"
import type { PeopleAccessStateResult } from "../types/people-access-state"

export async function getPeopleAccessStates(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PeopleAccessStateResult> {
  try {
    const rows = await createPeopleAccessStateRepository(supabase).findAllByCompany(companyId)
    return rows ? { status: "available", rows } : { status: "unavailable" }
  } catch {
    return { status: "unavailable" }
  }
}
