import {
  Brain,
  TrendingDown,
  TrendingUp,
  UsersRound,
  AlertTriangle,
} from "lucide-react"

import type {
  ScenarioInsight,
  ScenarioStructuralImpact,
  SpanOfControlResult,
  PositionCapacityResult,
} from "../../intelligence"

import type {
  ProjectedEmployee,
} from "../../projection"


type ScenarioIntelligencePanelProps = {
  structuralImpact: ScenarioStructuralImpact
  insights: readonly ScenarioInsight[]
  spanOfControl: SpanOfControlResult
  positionCapacity: PositionCapacityResult
  employees: readonly ProjectedEmployee[]
}


function VariationCard({
  label,
  current,
  projected,
  variation,
}: {
  label: string
  current: number
  projected: number
  variation: number
}) {
  const positive = variation > 0

  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-2xl font-semibold">
          {projected}
        </span>

        <span className="text-sm text-muted-foreground">
          atual {current}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        {positive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}

        <span>
          {variation > 0 ? "+" : ""}
          {variation}
        </span>
      </div>
    </div>
  )
}


function getEmployeeName(
  employees: readonly ProjectedEmployee[],
  employeeId: string
) {
  return (
    employees.find(
      (employee) =>
        employee.id === employeeId
    )?.fullName ??
    "Gestor não identificado"
  )
}


function SpanLevelBadge({
  level,
}: {
  level: "healthy" | "attention" | "critical"
}) {
  const labels = {
    healthy: "Adequado",
    attention: "Atenção",
    critical: "Crítico",
  }

  return (
    <span className="rounded-full border px-2 py-1 text-xs">
      {labels[level]}
    </span>
  )
}


export function ScenarioIntelligencePanel({
  structuralImpact,
  insights,
  spanOfControl,
  positionCapacity,
  employees,
}: ScenarioIntelligencePanelProps) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">

      <div className="flex items-center gap-3">
        <div className="rounded-xl border p-2">
          <Brain className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Inteligência do cenário
          </h2>

          <p className="text-sm text-muted-foreground">
            Impactos estruturais identificados pela simulação.
          </p>
        </div>
      </div>


      <div className="grid gap-3 sm:grid-cols-2">

        <VariationCard
          label="Departamentos"
          {...structuralImpact.departments}
        />

        <VariationCard
          label="Times"
          {...structuralImpact.teams}
        />

        <VariationCard
          label="Cargos"
          {...structuralImpact.positions}
        />

        <VariationCard
          label="Colaboradores"
          {...structuralImpact.employees}
        />

      </div>


      <div className="space-y-3">

        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4" />

          <h3 className="text-sm font-semibold">
            Inteligência de liderança
          </h3>
        </div>


        <div className="rounded-xl border p-4">

          <p className="text-sm text-muted-foreground">
            {spanOfControl.totalManagers} gestores analisados
          </p>


          <div className="mt-3 space-y-3">

            {spanOfControl.managers
              .filter(
                (manager) =>
                  manager.level !== "healthy"
              )
              .map((manager) => (
                <div
                  key={manager.employeeId}
                  className="rounded-lg border p-3"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="font-medium">
                        {getEmployeeName(
                          employees,
                          manager.employeeId
                        )}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {manager.directReports} liderados diretos
                      </p>
                    </div>


                    <SpanLevelBadge
                      level={manager.level}
                    />

                  </div>


                  <p className="mt-2 text-sm text-muted-foreground">
                    {manager.message}
                  </p>

                </div>
              ))}


            {spanOfControl.criticalCount === 0 &&
              spanOfControl.attentionCount === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Nenhum risco de liderança identificado.
                </div>
              )}

          </div>

        </div>

      </div>


      <div className="space-y-3">

        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />

          <h3 className="text-sm font-semibold">
            Capacidade de cargos
          </h3>
        </div>


        <div className="rounded-xl border p-4">

          <p className="text-sm text-muted-foreground">
            {positionCapacity.totalPositions} cargos analisados
          </p>


          <div className="mt-3 space-y-3">

            {positionCapacity.positions
              .filter(
                (position) =>
                  position.risk !== "healthy"
              )
              .map((position) => (
                <div
                  key={position.positionId}
                  className="rounded-lg border p-3"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="font-medium">
                        {position.positionName}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {position.occupants} ocupantes
                      </p>
                    </div>


                    <SpanLevelBadge
                      level={position.risk}
                    />

                  </div>


                  <p className="mt-2 text-sm text-muted-foreground">
                    {position.message}
                  </p>

                </div>
              ))}


            {positionCapacity.attentionCount === 0 &&
              positionCapacity.criticalCount === 0 && (
                <div className="text-sm text-muted-foreground">
                  Nenhum risco de capacidade identificado.
                </div>
              )}

          </div>

        </div>

      </div>



      {insights.length > 0 && (
        <div className="space-y-3">

          <h3 className="text-sm font-semibold">
            Insights
          </h3>

          {insights.map((insight) => (
            <div
              key={insight.type}
              className="rounded-xl border p-4"
            >
              <p className="font-medium">
                {insight.title}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {insight.description}
              </p>
            </div>
          ))}

        </div>
      )}

    </section>
  )
}
