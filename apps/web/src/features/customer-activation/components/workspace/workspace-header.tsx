type WorkspaceHeaderProps = {
  companyName: string
  isComplete: boolean
}

export function WorkspaceHeader({
  companyName,
  isComplete,
}: WorkspaceHeaderProps) {
  return (
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Customer Activation
      </p>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {isComplete
            ? `${companyName} está pronta para evoluir`
            : `Vamos preparar a ${companyName}`}
        </h1>

        <p className="max-w-3xl text-base leading-7 text-slate-600">
          {isComplete
            ? "A configuração inicial foi concluída. Agora você já pode usar os dados da empresa nas experiências do Evol OS."
            : "Conclua as missões abaixo para organizar as pessoas, estruturar a empresa e liberar uma visão mais completa do negócio."}
        </p>
      </div>
    </header>
  )
}
