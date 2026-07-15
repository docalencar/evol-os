import Link from "next/link"

import type {
  CustomerActivationViewModel,
} from "../view-models/customer-activation-view-model"

type CustomerActivationHomeProps = {
  activation: CustomerActivationViewModel
}

export function CustomerActivationHome({
  activation,
}: CustomerActivationHomeProps) {
  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">
          Customer Activation
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Bem-vindo ao Evol OS
        </h1>

        <p className="max-w-2xl text-slate-600">
          Vamos preparar a {activation.companyName} para organizar e
          desenvolver pessoas com dados reais.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-950">
                Configure sua empresa
              </h2>

              <p className="text-sm text-slate-600">
                {activation.completedSteps} de {activation.totalSteps} etapas
                concluídas
              </p>
            </div>

            <p className="text-2xl font-bold text-slate-950">
              {activation.progress}%
            </p>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            aria-label={`Progresso da ativação: ${activation.progress}%`}
          >
            <div
              className="h-full rounded-full bg-slate-950 transition-all"
              style={{
                width: `${activation.progress}%`,
              }}
            />
          </div>

          <div className="divide-y divide-slate-100">
            {activation.steps.map((step) => {
              const isCompleted = step.status === "completed"

              return (
                <div
                  key={step.id}
                  className="flex gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isCompleted
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-500",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {isCompleted ? "✓" : "·"}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </h3>

                    <p className="text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {activation.isComplete ? (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                Configuração inicial concluída
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Sua empresa já possui a estrutura básica necessária para usar
                o Evol OS.
              </p>
            </div>
          ) : activation.nextAction ? (
            <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Próximo passo
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {activation.nextAction.label}
                </p>
              </div>

              <Link
                href={activation.nextAction.href}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Continuar configuração
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
