import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

import { ProductWizardHelp } from "@/components/product"

type ReviewItemProps = {
  label: string
  value: string
}

function ReviewItem({
  label,
  value,
}: ReviewItemProps) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="text-sm font-medium">
        {value}
      </p>
    </div>
  )
}

type EmployeeReviewStepProps = {
  fullName: string
  email: string
  phone: string
  teamName?: string
  positionName?: string
  managerName?: string
  discProfileLabel?: string
  hireDateLabel: string
  birthDateLabel: string
  isEditing: boolean
}

export function EmployeeReviewStep({
  fullName,
  email,
  phone,
  teamName,
  positionName,
  managerName,
  discProfileLabel,
  hireDateLabel,
  birthDateLabel,
  isEditing,
}: EmployeeReviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Cadastro pronto para revisão
            </p>

            <p className="text-sm leading-5 text-muted-foreground">
              Confira os dados antes de{" "}
              {isEditing
                ? "salvar as alterações."
                : "adicionar a pessoa à organização."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem
          label="Nome"
          value={
            fullName ||
            "Nome não informado"
          }
        />

        <ReviewItem
          label="E-mail"
          value={
            email ||
            "Não informado"
          }
        />

        <ReviewItem
          label="Telefone"
          value={
            phone ||
            "Não informado"
          }
        />

        <ReviewItem
          label="Perfil DISC"
          value={
            discProfileLabel ||
            "Não informado"
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ReviewItem
          label="Time"
          value={teamName || "Sem time"}
        />

        <ReviewItem
          label="Cargo"
          value={positionName || "Sem cargo"}
        />

        <ReviewItem
          label="Gestor"
          value={managerName || "Sem gestor"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewItem
          label="Admissão"
          value={hireDateLabel}
        />

        <ReviewItem
          label="Nascimento"
          value={birthDateLabel}
        />
      </div>

      {!positionName ? (
        <EmployeeBusinessNotice>
          Nenhum cargo foi definido. Isso pode limitar análises de
          competências, desenvolvimento e estrutura organizacional.
        </EmployeeBusinessNotice>
      ) : null}

      {!managerName ? (
        <EmployeeBusinessNotice>
          Nenhum gestor foi definido. Confirme se a pessoa ainda não possui
          liderança direta ou se essa informação será preenchida depois.
        </EmployeeBusinessNotice>
      ) : null}

      <ProductWizardHelp label="O que acontece depois?">
        {isEditing
          ? "As informações serão atualizadas no perfil da pessoa e nos dados organizacionais relacionados."
          : "A pessoa será adicionada à organização com status ativo e poderá participar dos fluxos de desenvolvimento e avaliação."}
      </ProductWizardHelp>
    </div>
  )
}

function EmployeeBusinessNotice({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

      <p className="text-sm leading-5">
        {children}
      </p>
    </div>
  )
}
