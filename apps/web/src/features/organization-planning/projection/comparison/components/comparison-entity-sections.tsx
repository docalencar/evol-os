import React, { type ReactNode } from "react"
import type {
  DepartmentComparisonItemViewModel,
  EmployeeComparisonViewModel,
  PositionComparisonItemViewModel,
  ScenarioComparisonViewModel,
  StructuralComparisonViewModel,
  TeamComparisonItemViewModel,
} from "../view-models"

type ComparisonEntitySectionsProps = Readonly<{
  comparison: ScenarioComparisonViewModel
}>

export function ComparisonEntitySections({
  comparison,
}: ComparisonEntitySectionsProps) {
  return (
    <section aria-labelledby="entity-changes-title" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-blue-700">Detalhamento</p>
        <h2
          id="entity-changes-title"
          className="text-xl font-semibold text-slate-950"
        >
          Alterações por entidade
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StructuralEntitySection
          title="Departamentos"
          comparison={comparison.departments}
          renderEntity={renderDepartment}
        />
        <StructuralEntitySection
          title="Times"
          comparison={comparison.teams}
          renderEntity={renderTeam}
        />
        <StructuralEntitySection
          title="Cargos"
          comparison={comparison.positions}
          renderEntity={renderPosition}
        />
        <EmployeeSection comparison={comparison.employees} />
      </div>
    </section>
  )
}

type StructuralEntitySectionProps<TEntity extends { id: string }> = Readonly<{
  title: string
  comparison: StructuralComparisonViewModel<TEntity>
  renderEntity: (entity: TEntity) => ReactNode
}>

function StructuralEntitySection<TEntity extends { id: string }>({
  title,
  comparison,
  renderEntity,
}: StructuralEntitySectionProps<TEntity>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-4">
        <ChangeGroup
          label="Criados"
          items={comparison.created.map(({ entity }) => renderEntity(entity))}
        />
        <ChangeGroup
          label="Alterados"
          items={comparison.updated.map(({ after, changedFields }) => (
            <div key={after.id}>
              {renderEntity(after)}
              <p className="mt-1 text-xs text-slate-500">
                Campos: {changedFields.join(", ")}
              </p>
            </div>
          ))}
        />
        <ChangeGroup
          label="Arquivados"
          items={comparison.archived.map(({ after }) => renderEntity(after))}
        />
        <ChangeGroup
          label="Removidos"
          items={comparison.removed.map(({ entity }) => renderEntity(entity))}
        />
      </div>
    </article>
  )
}

function EmployeeSection({
  comparison,
}: Readonly<{ comparison: EmployeeComparisonViewModel }>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">Colaboradores</h3>
      <div className="mt-4 space-y-4">
        <ChangeGroup
          label="Adicionados"
          items={comparison.added.map(({ entity }) => renderEmployee(entity))}
        />
        <ChangeGroup
          label="Movimentados"
          items={comparison.moved.map((move) => (
            <div key={move.employee.id}>
              {renderEmployee(move.employee)}
              <p className="mt-1 text-xs text-slate-500">
                {move.previousPositionId ?? "Sem cargo"} →{" "}
                {move.positionId ?? "Sem cargo"}
              </p>
            </div>
          ))}
        />
        <ChangeGroup
          label="Removidos"
          items={comparison.removed.map(({ entity }) => renderEmployee(entity))}
        />
      </div>
    </article>
  )
}

type ChangeGroupProps = Readonly<{
  label: string
  items: readonly ReactNode[]
}>

function ChangeGroup({ label, items }: ChangeGroupProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} · {items.length}
      </p>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
        {items.map((item, index) => (
          <li key={index} className="px-3 py-2 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderDepartment(entity: DepartmentComparisonItemViewModel) {
  return (
    <div>
      <p className="font-medium text-slate-900">{entity.name}</p>
      <p className="text-xs text-slate-500">{entity.code ?? entity.id}</p>
    </div>
  )
}

function renderTeam(entity: TeamComparisonItemViewModel) {
  return (
    <div>
      <p className="font-medium text-slate-900">{entity.name}</p>
      <p className="text-xs text-slate-500">{entity.code ?? entity.id}</p>
    </div>
  )
}

function renderPosition(entity: PositionComparisonItemViewModel) {
  return (
    <div>
      <p className="font-medium text-slate-900">{entity.name}</p>
      <p className="text-xs text-slate-500">
        {entity.hierarchicalLevel} · {entity.weeklyWorkloadHours}h
      </p>
    </div>
  )
}

function renderEmployee(entity: { id: string; positionId: string | null }) {
  return (
    <div>
      <p className="font-medium text-slate-900">{entity.id}</p>
      <p className="text-xs text-slate-500">
        {entity.positionId ?? "Sem cargo"}
      </p>
    </div>
  )
}
