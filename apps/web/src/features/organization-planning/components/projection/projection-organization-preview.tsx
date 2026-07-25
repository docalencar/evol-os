import {
  BriefcaseBusiness,
  Building2,
  Network,
  Users,
} from "lucide-react"

import type {
  ProjectedOrganization,
} from "../../projection"

type ProjectionOrganizationPreviewProps = {
  organization: ProjectedOrganization
}

type DepartmentTotals = {
  teams: number
  positions: number
  employees: number
}

const PREVIEW_LIMIT = 6

function countByDepartment(
  organization: ProjectedOrganization
): Map<string, DepartmentTotals> {
  const totals = new Map<
    string,
    DepartmentTotals
  >()

  for (const department of organization.departments) {
    totals.set(department.id, {
      teams: 0,
      positions: 0,
      employees: 0,
    })
  }

  for (const team of organization.teams) {
    if (!team.departmentId) {
      continue
    }

    const current = totals.get(team.departmentId)

    if (current && team.status === "active") {
      current.teams += 1
    }
  }

  for (const position of organization.positions) {
    if (!position.departmentId) {
      continue
    }

    const current = totals.get(
      position.departmentId
    )

    if (
      current &&
      position.status === "active"
    ) {
      current.positions += 1
    }
  }

  for (const employee of organization.employees) {
    if (!employee.departmentId) {
      continue
    }

    const current = totals.get(
      employee.departmentId
    )

    if (
      current &&
      employee.status === "active"
    ) {
      current.employees += 1
    }
  }

  return totals
}

export function ProjectionOrganizationPreview({
  organization,
}: ProjectionOrganizationPreviewProps) {
  const activeDepartments =
    organization.departments.filter(
      (department) =>
        department.status === "active"
    )

  const totalsByDepartment =
    countByDepartment(organization)

  const visibleDepartments =
    activeDepartments.slice(0, PREVIEW_LIMIT)

  const hiddenDepartments =
    activeDepartments.length -
    visibleDepartments.length

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border bg-muted/40 p-2.5">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>

        <div>
          <h3 className="font-semibold">
            Preview organizacional
          </h3>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Distribuição projetada por departamento.
          </p>
        </div>
      </div>

      {visibleDepartments.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
          <p className="text-sm font-medium">
            Nenhum departamento ativo
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            A estrutura projetada ainda não possui
            departamentos ativos.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleDepartments.map(
            (department) => {
              const totals =
                totalsByDepartment.get(
                  department.id
                ) ?? {
                  teams: 0,
                  positions: 0,
                  employees: 0,
                }

              return (
                <article
                  key={department.id}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {department.name}
                    </p>

                    {department.code ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Código: {department.code}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Network className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          Equipes
                        </span>
                      </div>

                      <p className="mt-1 font-semibold">
                        {totals.teams}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          Cargos
                        </span>
                      </div>

                      <p className="mt-1 font-semibold">
                        {totals.positions}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs">
                          Pessoas
                        </span>
                      </div>

                      <p className="mt-1 font-semibold">
                        {totals.employees}
                      </p>
                    </div>
                  </div>
                </article>
              )
            }
          )}

          {hiddenDepartments > 0 ? (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Mais {hiddenDepartments}{" "}
              {hiddenDepartments === 1
                ? "departamento"
                : "departamentos"}{" "}
              na estrutura projetada.
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
