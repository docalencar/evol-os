import {
  createServerDatabase,
} from "@/lib/database/server-database"

import type {
  JobOpening,
  JobOpeningEmploymentType,
  JobOpeningPriority,
  JobOpeningReason,
  JobOpeningStatus,
  JobOpeningWorkModel,
} from "../types/job-opening"

type JobOpeningRow = {
  id: string
  company_id: string
  title: string
  description: string
  department_id: string
  position_id: string
  requesting_manager_id: string
  recruiter_id: string | null
  opening_reason: JobOpeningReason
  replaced_employee_id: string | null
  opening_justification: string
  positions_count: number
  current_headcount: number
  target_headcount: number
  work_model: JobOpeningWorkModel
  location: string | null
  employment_type: JobOpeningEmploymentType
  salary_min: number | null
  salary_max: number | null
  status: JobOpeningStatus
  priority: JobOpeningPriority
  target_hire_date: string | null
  approver_id: string | null
  approved_at: string | null
  notes: string | null
  estimated_monthly_cost: number | null
  is_budgeted: boolean
  created_by_user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

type CreateJobOpeningData = {
  companyId: string
  title: string
  description: string
  departmentId: string
  positionId: string
  requestingManagerId: string
  recruiterId?: string | null
  openingReason: JobOpeningReason
  replacedEmployeeId?: string | null
  openingJustification: string
  positionsCount: number
  currentHeadcount: number
  targetHeadcount: number
  workModel: JobOpeningWorkModel
  location?: string | null
  employmentType: JobOpeningEmploymentType
  salaryMin?: number | null
  salaryMax?: number | null
  status: JobOpeningStatus
  priority: JobOpeningPriority
  targetHireDate?: string | null
  approverId?: string | null
  approvedAt?: string | null
  notes?: string | null
  estimatedMonthlyCost?: number | null
  isBudgeted: boolean
  createdByUserId: string
}

type UpdateJobOpeningData = Omit<
  CreateJobOpeningData,
  "companyId" | "createdByUserId"
> & {
  companyId: string
  jobOpeningId: string
}

type UpdateJobOpeningStatusData = {
  companyId: string
  jobOpeningId: string
  status: JobOpeningStatus
  approverId: string | null
  approvedAt: string | null
}

function mapJobOpening(
  row: JobOpeningRow
): JobOpening {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    departmentId: row.department_id,
    positionId: row.position_id,
    requestingManagerId:
      row.requesting_manager_id,
    recruiterId: row.recruiter_id,
    openingReason: row.opening_reason,
    replacedEmployeeId:
      row.replaced_employee_id,
    openingJustification:
      row.opening_justification,
    positionsCount: row.positions_count,
    currentHeadcount: row.current_headcount,
    targetHeadcount: row.target_headcount,
    workModel: row.work_model,
    location: row.location,
    employmentType: row.employment_type,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    status: row.status,
    priority: row.priority,
    targetHireDate: row.target_hire_date,
    approverId: row.approver_id,
    approvedAt: row.approved_at,
    notes: row.notes,
    estimatedMonthlyCost:
      row.estimated_monthly_cost,
    isBudgeted: row.is_budgeted,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

function mapRows(
  rows: JobOpeningRow[] | null
): JobOpening[] | null {
  return rows?.map(mapJobOpening) ?? null
}

function normalizeJobOpeningInput(
  input: CreateJobOpeningData | UpdateJobOpeningData
) {
  return {
    title: input.title,
    description: input.description,
    department_id: input.departmentId,
    position_id: input.positionId,
    requesting_manager_id:
      input.requestingManagerId,
    recruiter_id: input.recruiterId ?? null,
    opening_reason: input.openingReason,
    replaced_employee_id:
      input.replacedEmployeeId ?? null,
    opening_justification:
      input.openingJustification,
    positions_count: input.positionsCount,
    current_headcount: input.currentHeadcount,
    target_headcount: input.targetHeadcount,
    work_model: input.workModel,
    location: input.location ?? null,
    employment_type: input.employmentType,
    salary_min: input.salaryMin ?? null,
    salary_max: input.salaryMax ?? null,
    status: input.status,
    priority: input.priority,
    target_hire_date:
      input.targetHireDate ?? null,
    approver_id: input.approverId ?? null,
    approved_at: input.approvedAt ?? null,
    notes: input.notes ?? null,
    estimated_monthly_cost:
      input.estimatedMonthlyCost ?? null,
    is_budgeted: input.isBudgeted,
    updated_at: new Date().toISOString(),
  }
}

export async function createJobOpeningRepository() {
  const supabase =
    await createServerDatabase()

  return {
    async findAllByCompany(
      companyId: string
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", {
          ascending: false,
        })

      return {
        data: mapRows(
          data as JobOpeningRow[] | null
        ),
        error,
      }
    },

    async findById(
      companyId: string,
      jobOpeningId: string
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", jobOpeningId)
        .is("deleted_at", null)
        .maybeSingle()

      return {
        data: data
          ? mapJobOpening(
              data as JobOpeningRow
            )
          : null,
        error,
      }
    },

    async create(
      input: CreateJobOpeningData
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .insert({
          company_id: input.companyId,
          created_by_user_id:
            input.createdByUserId,
          ...normalizeJobOpeningInput(input),
        })
        .select("*")
        .single()

      return {
        data: data
          ? mapJobOpening(
              data as JobOpeningRow
            )
          : null,
        error,
      }
    },

    async update(
      input: UpdateJobOpeningData
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .update(
          normalizeJobOpeningInput(input)
        )
        .eq("company_id", input.companyId)
        .eq("id", input.jobOpeningId)
        .is("deleted_at", null)
        .select("*")
        .single()

      return {
        data: data
          ? mapJobOpening(
              data as JobOpeningRow
            )
          : null,
        error,
      }
    },

    async archive(
      companyId: string,
      jobOpeningId: string
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .update({
          deleted_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", jobOpeningId)
        .is("deleted_at", null)
        .select("*")
        .single()

      return {
        data: data
          ? mapJobOpening(
              data as JobOpeningRow
            )
          : null,
        error,
      }
    },

    async updateStatus(
      input: UpdateJobOpeningStatusData
    ) {
      const { data, error } = await supabase
        .from("recruitment_job_openings")
        .update({
          status: input.status,
          approver_id: input.approverId,
          approved_at: input.approvedAt,
          updated_at:
            new Date().toISOString(),
        })
        .eq("company_id", input.companyId)
        .eq("id", input.jobOpeningId)
        .is("deleted_at", null)
        .select("*")
        .single()

      return {
        data: data
          ? mapJobOpening(
              data as JobOpeningRow
            )
          : null,
        error,
      }
    },
  }
}
