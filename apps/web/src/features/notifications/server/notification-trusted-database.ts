import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let trustedClient: SupabaseClient | null = null

export function createNotificationTrustedDatabase(): SupabaseClient {
  if (trustedClient) {
    return trustedClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "As credenciais server-only de Notifications não estão configuradas."
    )
  }

  trustedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return trustedClient
}
