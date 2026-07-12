"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  updateDevelopmentPlanAction,
} from "../actions/update-development-plan-action"

import {
  DEVELOPMENT_PLAN_PRIORITIES,
  DEVELOPMENT_PLAN_PRIORITY_LABELS,
  type DevelopmentPlanPriority,
} from "../constants/development-plan"

import type {
  DevelopmentPlan,
} from "../types/development-plan"

type EmployeeSelectOption = {
  id: string
  name: string
}

type DevelopmentPlanFormProps = {
  plan: DevelopmentPlan
  employeeName: string
  templateName?: string | null
  owners: EmployeeSelectOption[]
  onSuccess?: () => void
}

export function DevelopmentPlanForm({
  plan,
  employeeName,
  templateName,
  owners,
  onSuccess,
}: DevelopmentPlanFormProps) {
  const [isPending, startTransition] =
    useTransition()

  function handleSubmit(formData: FormData) {
    const input = {
      title: String(
        formData.get("title") ?? ""
      ),

      description: String(
        formData.get("description") ?? ""
      ),

      ownerId: String(
        formData.get("ownerId") ?? ""
      ),

      priority: String(
        formData.get("priority") ??
          "medium"
      ) as DevelopmentPlanPriority,

      startDate: String(
        formData.get("startDate") ?? ""
      ),

      dueDate: String(
        formData.get("dueDate") ?? ""
      ),
    }

    startTransition(async () => {
      const result =
        await updateDevelopmentPlanAction(
          plan.id,
          input
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="employeeName">
            Colaborador
          </Label>

          <Input
            id="employeeName"
            value={employeeName}
            disabled
            readOnly
            className="mt-1 bg-slate-50"
          />

          <p className="mt-1 text-xs text-slate-500">
            O colaborador não pode ser alterado.
          </p>
        </div>

        <div>
          <Label htmlFor="templateName">
            Template de origem
          </Label>

          <Input
            id="templateName"
            value={
              templateName ??
              "Plano criado sem Template"
            }
            disabled
            readOnly
            className="mt-1 bg-slate-50"
          />

          <p className="mt-1 text-xs text-slate-500">
            A origem do plano é preservada.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="title">
          Título
        </Label>

        <Input
          id="title"
          name="title"
          defaultValue={plan.title}
          placeholder="Ex.: Desenvolvimento de liderança"
          maxLength={120}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">
          Descrição
        </Label>

        <Textarea
          id="description"
          name="description"
          defaultValue={
            plan.description ?? ""
          }
          placeholder="Descreva os objetivos gerais deste plano."
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ownerId">
            Responsável
          </Label>

          <select
            id="ownerId"
            name="ownerId"
            defaultValue={
              plan.ownerId ?? ""
            }
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="">
              Sem responsável definido
            </option>

            {owners.map((owner) => (
              <option
                key={owner.id}
                value={owner.id}
              >
                {owner.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="priority">
            Prioridade
          </Label>

          <select
            id="priority"
            name="priority"
            defaultValue={plan.priority}
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            disabled={isPending}
          >
            {DEVELOPMENT_PLAN_PRIORITIES.map(
              (priority) => (
                <option
                  key={priority}
                  value={priority}
                >
                  {
                    DEVELOPMENT_PLAN_PRIORITY_LABELS[
                      priority
                    ]
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">
            Data de início
          </Label>

          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={
              plan.startDate ?? ""
            }
            disabled={isPending}
          />
        </div>

        <div>
          <Label htmlFor="dueDate">
            Data prevista
          </Label>

          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={
              plan.dueDate ?? ""
            }
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : "Salvar alterações"}
        </Button>
      </div>
    </form>
  )
}