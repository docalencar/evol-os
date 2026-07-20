import type {
  CopilotMessageViewModel,
} from "../../view-models/copilot-conversation-view-model"

type CopilotMessageItemProps = {
  message: CopilotMessageViewModel
}

function getRoleLabel(role: string) {
  switch (role) {
    case "assistant":
      return "Evol AI"

    case "user":
      return "Você"

    case "system":
      return "Sistema"

    default:
      return role
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Processando"

    case "failed":
      return "Falha"

    case "completed":
      return "Concluída"

    default:
      return status
  }
}

export function CopilotMessageItem({
  message,
}: CopilotMessageItemProps) {
  const isUser =
    message.role === "user"

  return (
    <article
      className={
        isUser
          ? "ml-auto max-w-3xl rounded-2xl bg-primary px-5 py-4 text-primary-foreground"
          : "max-w-3xl rounded-2xl border bg-card px-5 py-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">
          {getRoleLabel(message.role)}
        </p>

        <p className="text-xs opacity-70">
          {getStatusLabel(message.status)}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6">
        {message.content}
      </p>
    </article>
  )
}
