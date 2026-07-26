import {
  Card,
} from "@/components/ui/card"

import {
  Badge,
} from "@/components/ui/badge"

import type {
  ScenarioComparisonSummary,
} from "../../comparison"


type ScenarioImpactSummaryCardProps = {
  summary: ScenarioComparisonSummary
}


function ImpactRow({
  label,
  value,
}: {
  label: string
  value: number
}) {
  if (value === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <Badge>
        {value}
      </Badge>
    </div>
  )
}


function ImpactSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">
        {title}
      </h3>

      {children}
    </div>
  )
}


export function ScenarioImpactSummaryCard({
  summary,
}: ScenarioImpactSummaryCardProps) {
  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Impacto do cenário
        </h2>

        <p className="text-sm text-slate-600">
          Resumo das mudanças planejadas na estrutura organizacional.
        </p>
      </div>


      <ImpactSection title="Departamentos">
        <ImpactRow
          label="Criados"
          value={summary.departmentsCreated}
        />

        <ImpactRow
          label="Atualizados"
          value={summary.departmentsUpdated}
        />

        <ImpactRow
          label="Arquivados"
          value={summary.departmentsArchived}
        />
      </ImpactSection>


      <ImpactSection title="Times">
        <ImpactRow
          label="Criados"
          value={summary.teamsCreated}
        />

        <ImpactRow
          label="Atualizados"
          value={summary.teamsUpdated}
        />

        <ImpactRow
          label="Arquivados"
          value={summary.teamsArchived}
        />
      </ImpactSection>


      <ImpactSection title="Cargos">
        <ImpactRow
          label="Criados"
          value={summary.positionsCreated}
        />

        <ImpactRow
          label="Atualizados"
          value={summary.positionsUpdated}
        />

        <ImpactRow
          label="Movimentados"
          value={summary.positionsMoved}
        />

        <ImpactRow
          label="Arquivados"
          value={summary.positionsArchived}
        />
      </ImpactSection>


      <ImpactSection title="Colaboradores">
        <ImpactRow
          label="Criados"
          value={summary.employeesCreated}
        />

        <ImpactRow
          label="Atualizados"
          value={summary.employeesUpdated}
        />

        <ImpactRow
          label="Movimentados"
          value={summary.employeesMoved}
        />

        <ImpactRow
          label="Desligados"
          value={summary.employeesTerminated}
        />

        <ImpactRow
          label="Arquivados"
          value={summary.employeesArchived}
        />
      </ImpactSection>
    </Card>
  )
}
