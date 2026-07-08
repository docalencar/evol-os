import { createClient } from "@/lib/supabase/supabase/server"

export async function createServerDatabase() {
  return createClient()
}
