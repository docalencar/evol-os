import Link from "next/link"

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

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Colaboradores
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {activation.metrics.employees}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Pessoas ativas na estrutura inicial.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Departamentos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {activation.metrics.departments}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Áreas cadastradas para organizar a empresa.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargos
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {activation.metrics.positions}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Funções disponíveis para estruturar as pessoas.
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">
            Sua jornada de configuração
          </h2>

          <p className="text-sm text-slate-600">
            O Evol OS acompanha os dados reais da empresa e indica a ação mais
            importante para continuar.
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

      {activation.isComplete ? (
        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
                Ativação concluída
              </p>

              <h2 className="text-2xl font-bold tracking-tight">
                A estrutura inicial da {activation.companyName} está pronta.
              </h2>

              <p className="max-w-3xl text-sm leading-6 text-slate-300">
                Colaboradores, departamentos e cargos já podem alimentar as
                experiências de organização, desenvolvimento, liderança e
                inteligência do Evol OS.
              </p>
            </div>

            {activation.nextAction ? (
              <Link
                href={activation.nextAction.href}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                {activation.nextAction.label}
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
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
      )}
    </WorkspaceLayout>
  )
}
