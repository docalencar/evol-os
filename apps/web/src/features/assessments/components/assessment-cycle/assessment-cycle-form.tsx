"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createAssessmentCycleAction } from "../../actions/create-assessment-cycle-action"
import { updateAssessmentCycleAction } from "../../actions/update-assessment-cycle-action"
import {
  assessmentCycleStatusOptions,
  assessmentCycleTypeOptions,
} from "../../constants/assessment-cycle-options"
import type { AssessmentCycle } from "../../types/assessment-cycle"
import type { AssessmentTemplate } from "../../types/assessment-template"

type AssessmentCycleFormProps = {
  companyId: string
  templates: AssessmentTemplate[]
  cycle?: AssessmentCycle
  onSuccess?: () => void
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const textareaClassName =
  "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function AssessmentCycleForm({
  companyId,
  templates,
  cycle,
  onSuccess,
}: AssessmentCycleFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = cycle
        ? await updateAssessmentCycleAction(
            companyId,
            cycle.id,
            formData
          )
        : await createAssessmentCycleAction(companyId, formData)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do ciclo</Label>

        <Input
          id="name"
          name="name"
          defaultValue={cycle?.name ?? ""}
          placeholder="Ex.: Avaliação de Desempenho 2026"
          minLength={2}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <textarea
          id="description"
          name="description"
          className={textareaClassName}
          defaultValue={cycle?.description ?? ""}
          placeholder="Descreva o objetivo deste ciclo."
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assessmentTemplateId">
          Template da avaliação
        </Label>

        <select
          id="assessmentTemplateId"
          name="assessmentTemplateId"
          className={selectClassName}
          defaultValue={
            cycle?.assessment_template_id ?? ""
          }
          required
        >
          <option value="" disabled>
            Selecione um template
          </option>

          {templates
            .filter(
              (template) =>
                template.active &&
                template.status === "active"
            )
            .map((template) => (
              <option
                key={template.id}
                value={template.id}
              >
                {template.name}
              </option>
            ))}
        </select>

        {templates.filter(
          (template) =>
            template.active &&
            template.status === "active"
        ).length === 0 ? (
          <p className="text-sm text-amber-600">
            Crie e ative um template antes de cadastrar o ciclo.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessmentType">Tipo de avaliação</Label>

          <select
            id="assessmentType"
            name="assessmentType"
            className={selectClassName}
            defaultValue={cycle?.assessment_type ?? "performance"}
            required
          >
            {assessmentCycleTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>

          <select
            id="status"
            name="status"
            className={selectClassName}
            defaultValue={cycle?.status ?? "draft"}
            required
          >
            {assessmentCycleStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startDate">Data de início</Label>

          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={cycle?.start_date ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Data de término</Label>

          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={cycle?.end_date ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="closeDate">Encerramento</Label>

          <Input
            id="closeDate"
            name="closeDate"
            type="date"
            defaultValue={cycle?.close_date ?? ""}
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">
          Origens da avaliação
        </legend>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allowSelfAssessment"
            defaultChecked={cycle?.allow_self_assessment ?? true}
            className="h-4 w-4 rounded border-input"
          />
          Autoavaliação
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allowManagerAssessment"
            defaultChecked={
              cycle?.allow_manager_assessment ?? true
            }
            className="h-4 w-4 rounded border-input"
          />
          Avaliação pelo gestor
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allowPeerAssessment"
            defaultChecked={cycle?.allow_peer_assessment ?? false}
            className="h-4 w-4 rounded border-input"
          />
          Avaliação por pares
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allowDirectReportAssessment"
            defaultChecked={
              cycle?.allow_direct_report_assessment ?? false
            }
            className="h-4 w-4 rounded border-input"
          />
          Avaliação por liderados
        </label>
      </fieldset>

      <label className="flex items-start gap-3 rounded-md border p-4">
        <input
          type="checkbox"
          name="anonymous"
          defaultChecked={cycle?.anonymous ?? false}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />

        <span className="space-y-1">
          <span className="block text-sm font-medium">
            Respostas anônimas
          </span>

          <span className="block text-sm text-muted-foreground">
            A identidade dos avaliadores poderá ser protegida na
            apresentação dos resultados.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : cycle
              ? "Salvar alterações"
              : "Criar ciclo"}
        </Button>
      </div>
    </form>
  )
}
