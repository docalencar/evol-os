import { createClient } from "@/lib/supabase/supabase/client";
import type { Company } from "@/types/domain";

export async function listMyCompanies(): Promise<Company[]> {
  const supabase = createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id");

  if (membershipError) {
    throw membershipError;
  }

  const ids = (memberships ?? []).map((item) => item.company_id);

  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .in("id", ids)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data ?? [];
}
