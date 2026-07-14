"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createAssessmentSectionAction } from "../../actions/create-assessment-section-action"
import { updateAssessmentSectionAction } from "../../actions/update-assessment-section-action"
import {
  ASSESSMENT_SECTION_COLOR_OPTIONS,
  ASSESSMENT_SECTION_ICON_OPTIONS,
} from "../../constants/assessment-section-options"
import type { AssessmentSection } from "../../types/assessment-section"

type AssessmentSectionFormProps = {
  companyId: string
  assessmentTemplateId: string
  section?: AssessmentSection
  defaultDisplayOrder?: number
  onSuccess?: () => void
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const textareaClassName =
  "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function AssessmentSectionForm({
  companyId,
  assessmentTemplateId,
  section,
  defaultDisplayOrder = 0,
  onSuccess,
}: AssessmentSectionFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const input = {
        assessmentTemplateId,
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        icon: String(formData.get("icon") ?? ""),
        color: String(formData.get("color") ?? ""),
        weight: Number(formData.get("weight") ?? 1),
        displayOrder:
  section?.display_order ?? defaultDisplayOrder,
        active: formData.get("active") === "on",
      }

      const result = section
        ? await updateAssessmentSectionAction(
            companyId,
            section.id,
            input
          )
        : await createAssessmentSectionAction(companyId, input)

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
      <div className="grid gap-4 md:grid-cols-[140px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>

          <Input
            id="code"
            name="code"
            defaultValue={section?.code ?? ""}
            placeholder="COM"
            maxLength={30}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome da seção</Label>

          <Input
            id="name"
            name="name"
            defaultValue={section?.name ?? ""}
            placeholder="Ex.: Comunicação"
            minLength={2}
            maxLength={120}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <textarea
          id="description"
          name="description"
          className={textareaClassName}
          defaultValue={section?.description ?? ""}
          placeholder="Explique o que será avaliado nesta seção."
          maxLength={500}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="icon">Ícone</Label>

          <select
            id="icon"
            name="icon"
            className={selectClassName}
            defaultValue={section?.icon ?? ""}
          >
            <option value="">Sem ícone</option>

            {ASSESSMENT_SECTION_ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Cor</Label>

          <select
            id="color"
            name="color"
            className={selectClassName}
            defaultValue={section?.color ?? "blue"}
          >
            {ASSESSMENT_SECTION_COLOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weight">Peso</Label>

          <Input
            id="weight"
            name="weight"
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            defaultValue={section?.weight ?? 1}
            required
          />
        </div>

        
      </div>

      <label className="flex items-center gap-3 rounded-md border p-4 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={section?.active ?? true}
          className="h-4 w-4 rounded border-input"
        />

        Seção ativa
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : section
              ? "Salvar alterações"
              : "Criar seção"}
        </Button>
      </div>
    </form>
  )
}
