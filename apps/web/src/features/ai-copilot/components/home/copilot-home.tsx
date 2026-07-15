import type { CopilotHomeViewModel } from "../../view-models/copilot-home-view-model"

type Props = {
  viewModel: CopilotHomeViewModel
}

export function CopilotHome({
  viewModel,
}: Props) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          AI Copilot
        </h1>

        <p className="mt-2 text-muted-foreground">
          Seu assistente inteligente para gestão de pessoas.
        </p>
      </header>

      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground">
          O AI Copilot será construído nas próximas PRs.
        </p>

        <p className="mt-4 text-4xl font-bold">
          {viewModel.suggestions}
        </p>

        <p className="text-sm text-muted-foreground">
          sugestões disponíveis
        </p>
      </div>
    </div>
  )
}
