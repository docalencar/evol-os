"use client"

import { useRef, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { newSubmissionId } from "@/features/people-organization-mutations/submission-id"

import { createSeniorityLevelAction } from "../actions/create-seniority-level-action"
import { updateSeniorityLevelAction } from "../actions/update-seniority-level-action"
import type { SeniorityLevel } from "../types/seniority-level"

type SeniorityLevelFormProps = {
  companyId: string
  seniorityLevel?: SeniorityLevel
  onSuccess?: () => void
}

export function SeniorityLevelForm({
  companyId,
  seniorityLevel,
  onSuccess,
}: SeniorityLevelFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(seniorityLevel)

  // Stable per-submission identity for create idempotency: constant across
  // retries of the SAME submission, cleared after a success.
  const submissionIdRef = useRef<string | null>(null)

  function handleSubmit(formData: FormData) {
    if (!isEditing && !submissionIdRef.current) {
      submissionIdRef.current = newSubmissionId()
    }

    const input = {
      code: String(formData.get("code") ?? ""),
      label: String(formData.get("label") ?? ""),
      rank: Number(formData.get("rank") ?? 0),
      idempotencyKey: isEditing ? undefined : submissionIdRef.current,
    }

    startTransition(async () => {
      const result = seniorityLevel
        ? await updateSeniorityLevelAction(
            companyId,
            seniorityLevel.id,
            input
          )
        : await createSeniorityLevelAction(companyId, input)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      submissionIdRef.current = null
      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Código</Label>

        <Input
          id="code"
          name="code"
          defaultValue={seniorityLevel?.code ?? ""}
          placeholder="Ex.: JR"
          maxLength={40}
          required
        />

        <p className="mt-1 text-xs text-slate-500">
          Identificador curto e estável do nível.
        </p>
      </div>

      <div>
        <Label htmlFor="label">Nome</Label>

        <Input
          id="label"
          name="label"
          defaultValue={seniorityLevel?.label ?? ""}
          placeholder="Ex.: Júnior"
          maxLength={80}
          required
        />

        <p className="mt-1 text-xs text-slate-500">
          Como o nível aparece para as pessoas.
        </p>
      </div>

      <div>
        <Label htmlFor="rank">Ordem</Label>

        <Input
          id="rank"
          name="rank"
          type="number"
          min={0}
          step={1}
          defaultValue={seniorityLevel?.rank ?? 0}
        />

        <p className="mt-1 text-xs text-slate-500">
          Posição relativa na progressão. Não precisa ser sequencial —
          por exemplo 10, 20, 30 facilita inserções futuras.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar senioridade"}
        </Button>
      </div>
    </form>
  )
}
