import "server-only"

import {
  loadCurrentUserContext,
  type CurrentUserContext,
} from "@/features/authorization"
import { createServerDatabase } from "@/lib/database/server-database"

export async function loadNotificationActor(): Promise<CurrentUserContext> {
  return loadCurrentUserContext(await createServerDatabase())
}
