import "server-only"

import {
  type CurrentUserContext,
} from "@/features/authorization"
import { createServerDatabase } from "@/lib/database/server-database"
import { loadPreferenceAwareCurrentUserContext } from "@/lib/supabase/supabase/preference-aware-current-user-context"

export async function loadNotificationActor(): Promise<CurrentUserContext> {
  return loadPreferenceAwareCurrentUserContext(await createServerDatabase())
}
