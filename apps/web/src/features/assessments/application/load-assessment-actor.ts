import "server-only"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import type { AssessmentActor } from "./assessment-authorization"

export async function loadAssessmentActor(): Promise<AssessmentActor> {
  const { currentUser, personId } = await getCurrentCompanyContext()

  return Object.freeze({
    ...currentUser,
    personId,
  })
}
