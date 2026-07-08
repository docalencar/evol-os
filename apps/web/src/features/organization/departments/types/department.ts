export type DepartmentId = string;

export interface Department {
  id: DepartmentId;
  companyId: string;

  name: string;
  description: string | null;

  leaderId: string | null;

  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}