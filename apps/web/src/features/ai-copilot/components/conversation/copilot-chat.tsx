import type {
  CopilotConversationViewModel,
} from "../../view-models/copilot-conversation-view-model"

import {
  CopilotMessageItem,
} from "./copilot-message-item"

type CopilotChatProps = {
  viewModel: CopilotConversationViewModel
}

export function CopilotChat({
  viewModel,
}: CopilotChatProps) {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">
          {viewModel.title}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Converse com o Evol AI utilizando os dados e o contexto da organização.
        </p>
      </header>

      <div className="min-h-72 space-y-4 rounded-2xl border bg-muted/20 p-5">
        {viewModel.messages.length > 0 ? (
          viewModel.messages.map((message) => (
            <CopilotMessageItem
              key={message.id}
              message={message}
            />
          ))
        ) : (
          <div className="flex min-h-60 items-center justify-center text-center">
            <div>
              <p className="font-medium">
                Nenhuma mensagem ainda
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Inicie uma conversa utilizando o campo abaixo.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
