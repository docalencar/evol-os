export type Company = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  segment?: string | null;
  employee_range?: string | null;
  status: "active" | "inactive" | "trial";
};

export type PersonStatus = "active" | "inactive" | "on_leave" | "terminated";
export type DiscProfile = "D" | "I" | "S" | "C";

export type Person = {
  id: string;
  company_id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status: PersonStatus;
  manager_id?: string | null;
  team_id?: string | null;
  position_id?: string | null;
  disc_profile?: DiscProfile | null;
  avatar_url?: string | null;
  hire_date?: string | null;
};

export type Team = {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  parent_team_id?: string | null;
};

export type Position = {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
};
