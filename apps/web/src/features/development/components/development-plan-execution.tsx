"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  recordDevelopmentReviewAction,
  transitionDevelopmentActionAction,
  transitionDevelopmentPlanAction,
} from "../actions/development-execution-actions"
import type { DevelopmentAction } from "../types/development-action"
import type { DevelopmentReview } from "../types/development-review"
import type { DevelopmentPlanCapabilities } from "../services/development-plan-capabilities"

type Prerequisites = {
  hasActions: boolean
  actionsTerminal: boolean
  hasCompletedAction: boolean
  hasFinalReview: boolean
  ready: boolean
}

export function DevelopmentActionControls({
  planId,
  action,
  capabilities,
}: {
  planId: string
  action: DevelopmentAction
  capabilities: DevelopmentPlanCapabilities
}) {
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const eligible = action.status === "pending" || action.status === "in_progress"
  if (!eligible || (!capabilities.canExecuteActions && !capabilities.canSkipActions)) return null

  function run(transition: "start" | "complete" | "skip") {
    startTransition(async () => {
      const result = await transitionDevelopmentActionAction({
        planId,
        actionId: action.id,
        transition,
        reason: transition === "skip" ? reason : undefined,
      })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setReason("")
      toast.success(result.message)
    })
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap gap-2">
        {capabilities.canExecuteActions && action.status === "pending" ? (
          <Button size="sm" disabled={pending} onClick={() => run("start")}>Iniciar ação</Button>
        ) : null}
        {capabilities.canExecuteActions ? (
          <Button size="sm" disabled={pending} onClick={() => run("complete")}>Concluir ação</Button>
        ) : null}
      </div>
      {capabilities.canSkipActions ? (
        <div>
          <Label htmlFor={`skip-${action.id}`}>Motivo privado para ignorar</Label>
          <Textarea
            id={`skip-${action.id}`}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Obrigatório; visível apenas no registro protegido."
          />
          <Button className="mt-2" size="sm" variant="secondary" disabled={pending || reason.trim().length === 0} onClick={() => run("skip")}>
            Ignorar ação
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function DevelopmentReviewAndCompletion({
  planId,
  status,
  reviews,
  capabilities,
  prerequisites,
}: {
  planId: string
  status: "draft" | "active" | "completed" | "cancelled"
  reviews: DevelopmentReview[]
  capabilities: DevelopmentPlanCapabilities
  prerequisites: Prerequisites
}) {
  const [type, setType] = useState<"periodic" | "final">("periodic")
  const [summary, setSummary] = useState("")
  const [nextStep, setNextStep] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [pending, startTransition] = useTransition()

  function recordReview() {
    startTransition(async () => {
      const result = await recordDevelopmentReviewAction({ planId, type, summary, nextStep, idempotencyKey })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setSummary("")
      setNextStep("")
      setIdempotencyKey(crypto.randomUUID())
      toast.success(result.message)
    })
  }

  function transitionPlan(transition: "activate" | "complete") {
    startTransition(async () => {
      const result = await transitionDevelopmentPlanAction({ planId, transition })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">Histórico de revisões</h2>
        <p className="mt-1 text-sm text-slate-500">Registro append-only do acompanhamento do plano.</p>
        <div className="mt-5 space-y-3">
          {reviews.length === 0 ? <p className="text-sm text-slate-500">Nenhuma revisão registrada.</p> : reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge>{review.type === "final" ? "Final" : "Periódica"}</Badge>
                <span className="text-xs text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(review.reviewedAt))}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{review.summary}</p>
              {review.nextStep ? <p className="mt-2 text-sm text-slate-500"><strong>Próximo passo:</strong> {review.nextStep}</p> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        {capabilities.canRecordReview ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Registrar revisão</h2>
            <div className="flex gap-2">
              <Button size="sm" variant={type === "periodic" ? "default" : "secondary"} onClick={() => setType("periodic")}>Periódica</Button>
              <Button size="sm" variant={type === "final" ? "default" : "secondary"} disabled={!prerequisites.actionsTerminal || !prerequisites.hasCompletedAction} onClick={() => setType("final")}>Final</Button>
            </div>
            <Label htmlFor="review-summary">Resumo</Label>
            <Textarea id="review-summary" value={summary} maxLength={4000} onChange={(event) => setSummary(event.target.value)} />
            <Label htmlFor="review-next-step">Próximo passo {type === "periodic" ? "(obrigatório)" : "(opcional)"}</Label>
            <Textarea id="review-next-step" value={nextStep} maxLength={2000} onChange={(event) => setNextStep(event.target.value)} />
            <Button disabled={pending || summary.trim().length === 0 || (type === "periodic" && nextStep.trim().length === 0)} onClick={recordReview}>Registrar revisão</Button>
          </div>
        ) : status === "completed" || status === "cancelled" ? (
          <p className="text-sm text-slate-600">Plano terminal: histórico disponível somente para consulta.</p>
        ) : null}

        {capabilities.canActivate ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <Button disabled={pending} onClick={() => transitionPlan("activate")}>Ativar plano</Button>
          </div>
        ) : null}

        {capabilities.canCompletePlan ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="font-medium text-slate-900">Pré-requisitos para conclusão</h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>{prerequisites.hasActions ? "✓" : "○"} O plano possui ações</li>
              <li>{prerequisites.actionsTerminal ? "✓" : "○"} Todas as ações foram concluídas ou ignoradas</li>
              <li>{prerequisites.hasCompletedAction ? "✓" : "○"} Ao menos uma ação foi concluída</li>
              <li>{prerequisites.hasFinalReview ? "✓" : "○"} Uma revisão final foi registrada após a execução</li>
            </ul>
            <Button className="mt-4" disabled={pending || !prerequisites.ready} onClick={() => transitionPlan("complete")}>Concluir plano</Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
