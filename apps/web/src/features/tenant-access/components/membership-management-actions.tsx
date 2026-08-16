"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { EntityDialog } from "@/components/shared/entity-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import {
  changeCompanyMembershipRoleAction,
  deactivateCompanyMembershipAction,
  transferCompanyOwnershipAction,
} from "../actions"
import type { TenantMembershipRole } from "../application"
import type { PeopleAccessStateViewModel } from "../types/people-access-state"

type Feedback = Readonly<{ tone: "success" | "error"; message: string }>

function redirectFor(status: string, replace: (path: string) => void): boolean {
  if (status === "session_expired") replace("/login")
  if (status === "tenant_selection_required") replace("/select-company")
  if (status === "no_membership") replace("/onboarding")
  return ["session_expired", "tenant_selection_required", "no_membership"].includes(status)
}

function FeedbackMessage({ feedback, feedbackRef }: {
  feedback: Feedback | null
  feedbackRef: React.Ref<HTMLParagraphElement>
}) {
  if (!feedback) return null
  return (
    <p
      ref={feedbackRef}
      tabIndex={-1}
      role={feedback.tone === "error" ? "alert" : "status"}
      className={feedback.tone === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}
    >
      {feedback.message}
    </p>
  )
}

function RoleChangeDialog({ personName, accessState }: {
  personName: string
  accessState: PeopleAccessStateViewModel
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [newRole, setNewRole] = useState<TenantMembershipRole>(accessState.membershipRole ?? "employee")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  if (!accessState.membershipId || !accessState.membershipRole || !accessState.membershipStatus) return null

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    if (nextOpen) {
      setNewRole(accessState.membershipRole ?? "employee")
      setFeedback(null)
      submissionInFlight.current = false
    }
    setOpen(nextOpen)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionInFlight.current || newRole === accessState.membershipRole ||
      !accessState.roleOptions.some((option) => option.value === newRole)) return
    submissionInFlight.current = true
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await changeCompanyMembershipRoleAction({
          membershipId: accessState.membershipId!,
          expectedRole: accessState.membershipRole!,
          expectedStatus: accessState.membershipStatus!,
          newRole,
        })
        if (redirectFor(result.status, router.replace)) return
        if (result.status === "membership_role_changed") {
          setFeedback({ tone: "success", message: "Papel alterado com sucesso." })
          router.refresh()
        } else {
          setFeedback({ tone: "error", message: "message" in result ? result.message : "Não foi possível concluir a operação." })
        }
      } catch {
        setFeedback({ tone: "error", message: "Não foi possível concluir a operação." })
      } finally {
        submissionInFlight.current = false
      }
    })
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={<Button type="button" size="sm" variant="secondary">Alterar papel</Button>}
      title="Alterar papel de acesso"
      description={`${personName} possui atualmente o papel ${accessState.roleLabel ?? "não identificado"}.`}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <Label htmlFor={`membership-role-${accessState.membershipId}`}>Novo papel</Label>
          <select
            id={`membership-role-${accessState.membershipId}`}
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as TenantMembershipRole)}
            disabled={isPending}
            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-evol-blue focus:outline-none focus:ring-1 focus:ring-evol-blue disabled:opacity-60"
          >
            {accessState.roleOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.value === accessState.membershipRole}>
                {option.label}{option.value === accessState.membershipRole ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </div>
        <FeedbackMessage feedback={feedback} feedbackRef={feedbackRef} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button type="submit" disabled={isPending || newRole === accessState.membershipRole}>
            {isPending ? "Alterando..." : "Confirmar alteração"}
          </Button>
        </div>
      </form>
    </EntityDialog>
  )
}

function DeactivateMembershipDialog({ personName, accessState }: {
  personName: string
  accessState: PeopleAccessStateViewModel
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isPending, startTransition] = useTransition()
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  if (!accessState.membershipId || !accessState.membershipRole || !accessState.membershipStatus) return null

  function submit(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (submissionInFlight.current) return
    submissionInFlight.current = true
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await deactivateCompanyMembershipAction({
          membershipId: accessState.membershipId!,
          expectedRole: accessState.membershipRole!,
          expectedStatus: accessState.membershipStatus!,
        })
        if (redirectFor(result.status, router.replace)) return
        if (result.status === "membership_deactivated") {
          setFeedback({ tone: "success", message: "Acesso desativado com sucesso." })
          router.refresh()
        } else {
          setFeedback({ tone: "error", message: "message" in result ? result.message : "Não foi possível concluir a operação." })
        }
      } catch {
        setFeedback({ tone: "error", message: "Não foi possível concluir a operação." })
      } finally {
        submissionInFlight.current = false
      }
    })
  }

  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger render={<Button type="button" size="sm" variant="destructive" disabled={isPending} />}>
          Desativar acesso
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar acesso de {personName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta pessoa perderá o acesso à empresa. O cadastro da pessoa não será excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FeedbackMessage feedback={feedback} feedbackRef={feedbackRef} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isPending} onClick={submit}>
              {isPending ? "Desativando..." : "Confirmar desativação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TransferOwnershipDialog({ personName, accessState }: {
  personName: string
  accessState: PeopleAccessStateViewModel
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [demoteChoice, setDemoteChoice] = useState<"" | "keep" | "demote">("")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isPending, startTransition] = useTransition()
  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  if (!accessState.membershipId || !accessState.membershipRole) return null

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    if (nextOpen) {
      setDemoteChoice("")
      setFeedback(null)
      submissionInFlight.current = false
    }
    setOpen(nextOpen)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionInFlight.current || demoteChoice === "") return
    submissionInFlight.current = true
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await transferCompanyOwnershipAction({
          targetMembershipId: accessState.membershipId!,
          expectedTargetRole: accessState.membershipRole!,
          demoteActor: demoteChoice === "demote",
        })
        if (redirectFor(result.status, router.replace)) return
        if (result.status === "ownership_transferred") {
          setFeedback({ tone: "success", message: "Propriedade transferida com sucesso." })
          router.refresh()
        } else {
          setFeedback({ tone: "error", message: "message" in result ? result.message : "Não foi possível concluir a operação." })
        }
      } catch {
        setFeedback({ tone: "error", message: "Não foi possível concluir a operação." })
      } finally {
        submissionInFlight.current = false
      }
    })
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={<Button type="button" size="sm" variant="secondary">Transferir propriedade</Button>}
      title="Transferir propriedade"
      description={`${personName} passará a ser proprietário da empresa.`}
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset className="space-y-2" disabled={isPending}>
          <legend className="text-sm font-medium text-slate-900">Seu papel após a transferência</legend>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="radio" name="demote-actor" value="keep" checked={demoteChoice === "keep"} onChange={() => setDemoteChoice("keep")} />
            Continuar como proprietário
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="radio" name="demote-actor" value="demote" checked={demoteChoice === "demote"} onChange={() => setDemoteChoice("demote")} />
            Tornar meu papel Admin
          </label>
        </fieldset>
        <FeedbackMessage feedback={feedback} feedbackRef={feedbackRef} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button type="submit" disabled={isPending || demoteChoice === ""}>
            {isPending ? "Transferindo..." : "Confirmar transferência"}
          </Button>
        </div>
      </form>
    </EntityDialog>
  )
}

export function MembershipManagementActions({ personName, accessState }: {
  personName: string
  accessState: PeopleAccessStateViewModel
}) {
  if (!accessState.membershipId) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {accessState.canChangeRole ? <RoleChangeDialog personName={personName} accessState={accessState} /> : null}
      {accessState.canDeactivate ? <DeactivateMembershipDialog personName={personName} accessState={accessState} /> : null}
      {accessState.canTransferOwnership ? <TransferOwnershipDialog personName={personName} accessState={accessState} /> : null}
    </div>
  )
}
