"use client"

import {
  GitBranch,
  Plus,
  Search,
  X,
} from "lucide-react"
import {
  useMemo,
  useState,
} from "react"

import { Button } from "@/components/ui/button"

import type { PlanningChangeSet } from "../../change-sets"
import {
  getChangeSetActionStyle,
} from "./change-set-action-style"
import { ChangeSetCard } from "./change-set-card"
import {
  getChangeSetPresentation,
} from "./change-set-description"
import {
  filterChangeSets,
  type ChangeSetEntityFilter,
} from "./change-set-filters"
import { groupChangeSets } from "./change-set-groups"
import { getChangeSetStats } from "./change-set-stats"

type ChangeSetTimelineProps = Readonly<{
  changeSets: readonly PlanningChangeSet[]
}>

type FilterOption = Readonly<{
  value: ChangeSetEntityFilter
  label: string
  countKey:
    | "total"
    | "departments"
    | "teams"
    | "positions"
    | "employees"
}>

const FILTER_OPTIONS: readonly FilterOption[] =
  Object.freeze([
    {
      value: "all",
      label: "Todos",
      countKey: "total",
    },
    {
      value: "department",
      label: "Departamentos",
      countKey: "departments",
    },
    {
      value: "team",
      label: "Equipes",
      countKey: "teams",
    },
    {
      value: "position",
      label: "Cargos",
      countKey: "positions",
    },
    {
      value: "employee",
      label: "Colaboradores",
      countKey: "employees",
    },
  ])

function getChangeLabel(count: number): string {
  return count === 1
    ? "alteração"
    : "alterações"
}

function EmptyChangeSetTimeline() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/30">
        <GitBranch className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="mt-4 font-semibold">
        Nenhuma alteração planejada
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Adicione mudanças de departamentos, equipes, cargos
        ou pessoas para construir a estrutura projetada.
      </p>

      <Button
        type="button"
        className="mt-6"
        disabled
        title="O cadastro de alterações será implementado na próxima etapa."
      >
        <Plus className="mr-2 h-4 w-4" />
        Nova alteração
      </Button>
    </div>
  )
}

function EmptyFilteredTimeline({
  onClear,
}: Readonly<{
  onClear: () => void
}>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/30">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="mt-4 font-semibold">
        Nenhuma alteração encontrada
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Tente outro termo ou remova os filtros para visualizar
        todas as alterações deste cenário.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-6"
        onClick={onClear}
      >
        <X className="mr-2 h-4 w-4" />
        Limpar filtros
      </Button>
    </div>
  )
}

export function ChangeSetTimeline({
  changeSets,
}: ChangeSetTimelineProps) {
  const [query, setQuery] = useState("")
  const [entityFilter, setEntityFilter] =
    useState<ChangeSetEntityFilter>("all")

  const stats = useMemo(
    () => getChangeSetStats(changeSets),
    [changeSets]
  )

  const filteredChangeSets = useMemo(
    () =>
      filterChangeSets(changeSets, {
        query,
        entity: entityFilter,
      }),
    [
      changeSets,
      entityFilter,
      query,
    ]
  )

  const groups = useMemo(
    () => groupChangeSets(filteredChangeSets),
    [filteredChangeSets]
  )

  const positionById = useMemo(
    () =>
      new Map(
        filteredChangeSets.map(
          (changeSet, index) => [
            changeSet.id,
            index + 1,
          ]
        )
      ),
    [filteredChangeSets]
  )

  const hasActiveFilters =
    query.trim().length > 0 ||
    entityFilter !== "all"

  function clearFilters() {
    setQuery("")
    setEntityFilter("all")
  }

  if (changeSets.length === 0) {
    return <EmptyChangeSetTimeline />
  }

  return (
    <div>
      <div className="space-y-4 border-b bg-muted/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {stats.total}{" "}
              {getChangeLabel(stats.total)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Organizadas por tipo de entidade.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Buscar alteração..."
              aria-label="Buscar alterações planejadas"
              className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2"
          aria-label="Filtrar alterações por entidade"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive =
              entityFilter === option.value
            const count = stats[option.countKey]

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setEntityFilter(option.value)
                }
                aria-pressed={isActive}
                className={
                  isActive
                    ? "inline-flex h-9 items-center rounded-full border border-primary bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors"
                    : "inline-flex h-9 items-center rounded-full border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {option.label}

                <span
                  className={
                    isActive
                      ? "ml-2 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] leading-none"
                      : "ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                  }
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              {filteredChangeSets.length}{" "}
              {getChangeLabel(
                filteredChangeSets.length
              )}{" "}
              encontrada
              {filteredChangeSets.length === 1
                ? ""
                : "s"}
            </span>

            <button
              type="button"
              onClick={clearFilters}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>

      {filteredChangeSets.length === 0 ? (
        <EmptyFilteredTimeline
          onClear={clearFilters}
        />
      ) : (
        <div className="space-y-8 p-5">
          {groups.map((group) => (
            <section
              key={group.entity}
              aria-labelledby={`change-set-group-${group.entity}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div>
                  <h3
                    id={`change-set-group-${group.entity}`}
                    className="text-sm font-semibold"
                  >
                    {group.label}
                  </h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.changeSets.length}{" "}
                    {getChangeLabel(
                      group.changeSets.length
                    )}
                  </p>
                </div>

                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute bottom-6 left-2 top-6 w-px bg-border"
                />

                <ol className="relative space-y-4">
                  {group.changeSets.map(
                    (changeSet) => {
                      const presentation =
                        getChangeSetPresentation(
                          changeSet
                        )

                      const actionStyle =
                        getChangeSetActionStyle(
                          presentation.action
                        )

                      return (
                        <li
                          key={changeSet.id}
                          className="relative pl-8"
                        >
                          <div
                            aria-hidden="true"
                            className={[
                              "absolute left-0 top-6 z-10 flex h-4 w-4 items-center justify-center rounded-full border",
                              actionStyle.timelineMarker,
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "h-1.5 w-1.5 rounded-full",
                                actionStyle.timelineDot,
                              ].join(" ")}
                            />
                          </div>

                          <ChangeSetCard
                            changeSet={changeSet}
                            position={
                              positionById.get(
                                changeSet.id
                              ) ?? 0
                            }
                          />
                        </li>
                      )
                    }
                  )}
                </ol>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
