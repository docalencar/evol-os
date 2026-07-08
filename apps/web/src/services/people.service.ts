import { createClient } from "@/lib/supabase/supabase/client";
import type { Person } from "@/types/domain";

export async function listPeople(companyId: string): Promise<Person[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createPerson(input: Omit<Person, "id">): Promise<Person> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("people")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
