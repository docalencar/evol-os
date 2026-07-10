"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createCompetencyAction } from "../actions/create-competency-action"
import { updateCompetencyAction } from "../actions/update-competency-action"
import type { Competency } from "../types/competency"

type CompetencyFormProps = {
  companyId: string
  competency?: Competency
  onSuccess?: () => void
}

export function CompetencyForm({
  companyId,
  competency,
  onSuccess,
}: CompetencyFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(competency)

  function handleSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? "behavioral"),
      expectedLevel: Number(formData.get("expectedLevel") ?? 3),
      weight: Number(formData.get("weight") ?? 3),
      active: true,
    }

    startTransition(async () => {
      const result = competency
        ? await updateCompetencyAction(
            companyId,
            competency.id,
            input
          )
        : await createCompetencyAction(
            companyId,
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
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>

        <Input
          id="name"
          name="name"
          defaultValue={competency?.name ?? ""}
          placeholder="Ex.: Comunicação"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">
          Descrição
        </Label>

        <Input
          id="description"
          name="description"
          defaultValue={
            competency?.description ?? ""
          }
          placeholder="Descrição da competência"
        />
      </div>

      <div>
        <Label htmlFor="category">
          Categoria
        </Label>

        <select
          id="category"
          name="category"
          defaultValue={
            competency?.category ??
            "behavioral"
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="behavioral">
            Comportamental
          </option>

          <option value="technical">
            Técnica
          </option>

          <option value="leadership">
            Liderança
          </option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expectedLevel">
            Nível esperado
          </Label>

          <Input
            id="expectedLevel"
            name="expectedLevel"
            type="number"
            min={1}
            max={5}
            defaultValue={
              competency?.expected_level ?? 3
            }
          />
        </div>

        <div>
          <Label htmlFor="weight">
            Peso
          </Label>

          <Input
            id="weight"
            name="weight"
            type="number"
            min={1}
            max={5}
            defaultValue={
              competency?.weight ?? 3
            }
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
            : isEditing
              ? "Salvar alterações"
              : "Criar competência"}
        </Button>
      </div>
    </form>
  )
}
