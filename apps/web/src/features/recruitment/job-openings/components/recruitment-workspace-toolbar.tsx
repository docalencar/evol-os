import { Input } from "@/components/ui/input"

import {
  JOB_OPENING_PRIORITIES,
  JOB_OPENING_PRIORITY_LABELS,
  JOB_OPENING_STATUSES,
  JOB_OPENING_STATUS_LABELS,
} from "../constants/job-opening-options"
import { JobOpeningCreateWizard } from "./job-opening-create-wizard"

type RecruitmentDepartmentOption = {
  id: string
  name: string
}

type RecruitmentEmployeeOption = {
  id: string
  fullName: string
}

type RecruitmentWorkspaceToolbarProps = {
  departments: RecruitmentDepartmentOption[]
  positions: RecruitmentDepartmentOption[]
  employees: RecruitmentEmployeeOption[]
}

const selectClassName = [
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3",
  "text-sm text-slate-900 outline-none transition-colors",
  "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
].join(" ")

export function RecruitmentWorkspaceToolbar({
  departments,
  positions,
  employees,
}: RecruitmentWorkspaceToolbarProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="job-opening-search"
              className="sr-only"
            >
              Buscar vagas
            </label>

            <Input
              id="job-opening-search"
              type="search"
              placeholder="Buscar vagas..."
            />
          </div>

          <select
            aria-label="Filtrar vagas por status"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Todos os status</option>

            {JOB_OPENING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {JOB_OPENING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar vagas por departamento"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Todos os departamentos</option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar vagas por prioridade"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Todas as prioridades</option>

            {JOB_OPENING_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {JOB_OPENING_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full xl:w-auto">
          <JobOpeningCreateWizard
            departments={departments}
            positions={positions}
            employees={employees}
          />
        </div>
      </div>
    </section>
  )
}
