"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { issueCompanyMemberInvitationAction } from "../actions"
import type { TenantMembershipRole } from "../application"
import type { InvitationRoleOption } from "../presentation/invitation-role-options"

type InvitationFeedback = Readonly<{
  tone: "success" | "error"
  message: string
}>

export function InvitationIssueDialog({
  personId,
  personName,
  email,
  roleOptions,
}: {
  personId: string
  personName: string
  email: string
  roleOptions: readonly InvitationRoleOption[]
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [intendedRole, setIntendedRole] = useState<TenantMembershipRole>(
    roleOptions[0]?.value ?? "employee",
  )
  const [feedback, setFeedback] = useState<InvitationFeedback | null>(null)
  const [invitationCreated, setInvitationCreated] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus()
  }, [feedback])

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    if (nextOpen) {
      setIntendedRole(roleOptions[0]?.value ?? "employee")
      setFeedback(null)
      setInvitationCreated(false)
      submissionInFlight.current = false
    }
    setOpen(nextOpen)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      submissionInFlight.current ||
      !roleOptions.some((option) => option.value === intendedRole)
    ) {
      return
    }

    submissionInFlight.current = true
    setFeedback(null)

    startTransition(async () => {
      try {
        const result = await issueCompanyMemberInvitationAction({
          personId,
          intendedRole,
        })

        if (result.status === "invitation_sent") {
          setInvitationCreated(true)
          setFeedback({
            tone: "success",
            message: `Convite enviado para ${email}.`,
          })
          return
        }

        if (result.status === "session_expired") {
          router.replace("/login")
          return
        }

        if (result.status === "tenant_selection_required") {
          router.replace("/select-company")
          return
        }

        if (result.status === "no_membership") {
          router.replace("/onboarding")
          return
        }

        if (result.status === "invitation_created_delivery_failed") {
          setInvitationCreated(true)
          setFeedback({
            tone: "error",
            message: "O convite foi criado, mas o envio do e-mail não foi confirmado.",
          })
          return
        }

        if (result.status === "invitation_created_delivery_unknown") {
          setInvitationCreated(true)
          setFeedback({
            tone: "error",
            message: "O convite foi criado, mas não foi possível confirmar a entrega do e-mail.",
          })
          return
        }

        if (result.status === "configuration_error") {
          setInvitationCreated(true)
          setFeedback({
            tone: "error",
            message: "O convite foi criado, mas o envio não está disponível no momento.",
          })
          return
        }

        setFeedback({
          tone: "error",
          message: result.message,
        })
      } catch {
        setFeedback({
          tone: "error",
          message: "Não foi possível concluir a operação.",
        })
      } finally {
        submissionInFlight.current = false
      }
    })
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button variant="secondary" size="sm">
          Convidar para acessar
        </Button>
      }
      title="Convidar para acessar o Evol OS"
      description="Confirme a pessoa e defina o papel de acesso."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{personName}</p>
          <p className="text-sm text-slate-600">{email}</p>
          <p className="text-xs text-slate-500">
            O convite será enviado para este e-mail cadastrado.
          </p>
        </div>

        <div>
          <Label htmlFor={`invitation-role-${personId}`}>Papel de acesso</Label>
          <select
            id={`invitation-role-${personId}`}
            value={intendedRole}
            onChange={(event) =>
              setIntendedRole(event.target.value as TenantMembershipRole)
            }
            disabled={isPending}
            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-evol-blue focus:outline-none focus:ring-1 focus:ring-evol-blue disabled:cursor-wait disabled:opacity-60"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {feedback ? (
          <p
            ref={feedbackRef}
            role={feedback.tone === "error" ? "alert" : "status"}
            tabIndex={-1}
            className={
              feedback.tone === "success"
                ? "text-sm text-emerald-700"
                : "text-sm text-red-700"
            }
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Fechar
          </Button>
          <Button
            type="submit"
            disabled={isPending || invitationCreated || roleOptions.length === 0}
          >
            {isPending
              ? "Enviando convite..."
              : invitationCreated
                ? "Convite criado"
                : "Enviar convite"}
          </Button>
        </div>
      </form>
    </EntityDialog>
  )
}
