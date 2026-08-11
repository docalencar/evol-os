import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { InvitationEntryState } from "../presentation/present-invitation-entry-state"

type ContinuationFormAction = (formData: FormData) => void | Promise<void>

// Presentational only. Receives a coarse state and, for the authentication step,
// two server-action references (bound server-side). It never receives any
// invitation data or secret, and does not trigger acceptance.
export function InvitationEntryCard({
  state,
  loginAction,
  signupAction,
}: {
  state: InvitationEntryState
  loginAction: ContinuationFormAction
  signupAction: ContinuationFormAction
}) {
  if (state === "invalid") {
    return (
      <Card className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">
          Este convite não é válido.
        </h1>
        <p className="text-sm text-slate-600">
          Verifique se você usou o link mais recente recebido por e-mail.
        </p>
      </Card>
    )
  }

  if (state === "authentication_required") {
    return (
      <Card className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">
            Continue com o seu convite
          </h1>
          <p className="text-sm text-slate-600">
            Você precisa entrar ou criar uma conta para continuar com este
            convite.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={loginAction}>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Entrar
            </button>
          </form>
          <form action={signupAction}>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Criar conta
            </button>
          </form>
        </div>
        <p className="text-xs text-slate-500">
          Após autenticar, você volta automaticamente para este convite.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">
          Tudo pronto para continuar
        </h1>
        <p className="text-sm text-slate-600">
          Você está autenticado e pode continuar com este convite.
        </p>
      </div>
      <button
        type="button"
        disabled
        className={cn(buttonVariants({ variant: "default" }))}
      >
        Aceite será habilitado no próximo passo
      </button>
    </Card>
  )
}
