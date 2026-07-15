type CustomerActivationHomeProps = {
  companyName: string
}

export function CustomerActivationHome({
  companyName,
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
          Vamos preparar a {companyName} para começar a organizar e desenvolver
          pessoas com dados reais.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold text-slate-950">
            Configure sua empresa
          </h2>

          <p className="text-sm leading-6 text-slate-600">
            O Evol OS irá orientar os próximos passos para cadastrar pessoas,
            revisar a estrutura organizacional e preparar seu dashboard.
          </p>

          <p className="text-sm font-medium text-slate-700">
            Na próxima etapa, mostraremos o progresso real da ativação e a ação
            mais importante para continuar.
          </p>
        </div>
      </section>
    </main>
  )
}
