import type {
  CustomerActivationViewModel,
} from "../view-models/customer-activation-view-model"
import { MissionCard } from "./workspace/mission-card"
import { WorkspaceHeader } from "./workspace/workspace-header"
import { WorkspaceLayout } from "./workspace/workspace-layout"
import { WorkspaceProgress } from "./workspace/workspace-progress"

type CustomerActivationHomeProps = {
  activation: CustomerActivationViewModel
}

export function CustomerActivationHome({
  activation,
}: CustomerActivationHomeProps) {
  const currentStep = activation.steps.find(
    (step) => step.status === "pending"
  )

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        companyName={activation.companyName}
        isComplete={activation.isComplete}
      />

      <WorkspaceProgress
        progress={activation.progress}
        completedSteps={activation.completedSteps}
        totalSteps={activation.totalSteps}
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">
            Sua jornada de configuração
          </h2>

          <p className="text-sm text-slate-600">
            O Evol OS destaca automaticamente a ação mais importante para você
            continuar.
          </p>
        </div>

        <div className="grid gap-4">
          {activation.steps.map((step, index) => {
            const isCurrent = step.id === currentStep?.id

            return (
              <MissionCard
                key={step.id}
                step={step}
                position={index + 1}
                isCurrent={isCurrent}
                action={
                  isCurrent
                    ? activation.nextAction
                    : null
                }
              />
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            O que será liberado
          </p>

          <h2 className="text-lg font-semibold text-slate-950">
            Uma visão completa da sua organização
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Ao concluir a configuração inicial, o Evol OS poderá transformar
            os dados de pessoas, departamentos e cargos em prioridades,
            indicadores e recomendações para o RH e as lideranças.
          </p>
        </div>
      </section>
    </WorkspaceLayout>
  )
}
