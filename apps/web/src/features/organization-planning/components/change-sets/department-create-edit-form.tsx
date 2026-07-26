
"use client"

import {
  useTransition,
} from "react"

import {
  useRouter,
} from "next/navigation"

import {
  toast,
} from "sonner"

import {
  Button,
} from "@/components/ui/button"

import {
  Input,
} from "@/components/ui/input"

import {
  Label,
} from "@/components/ui/label"

import {
  updatePlanningChangeSetAction,
} from "../../actions"

import {
  ProjectedDepartmentSelector,
  type ProjectedDepartmentSelectorOption,
} from "../selectors"

import type {
  DepartmentCreateChangeSet,
} from "../../change-sets"


const textareaClassName = [
  "flex min-h-28 w-full rounded-md border border-input",
  "bg-background px-3 py-2 text-sm",
  "ring-offset-background",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ")


type DepartmentCreateEditFormProps = {
  changeSet: DepartmentCreateChangeSet
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  onSuccess?: () => void
  onCancel?: () => void
}


export function DepartmentCreateEditForm({
  changeSet,
  scenarioId,
  departments,
  onSuccess,
  onCancel,
}: DepartmentCreateEditFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()


  function handleSubmit(
    formData: FormData
  ) {
    const name = String(
      formData.get("name") ?? ""
    )

    const code = String(
      formData.get("code") ?? ""
    )

    const description = String(
      formData.get("description") ?? ""
    )

    const parentDepartmentId = String(
      formData.get(
        "parentDepartmentId"
      ) ?? ""
    )


    startTransition(async () => {
      const result =
        await updatePlanningChangeSetAction({
          changeSetId: changeSet.id,
          scenarioId,
          changeType:
            "department.create",
          expectedVersion:
            changeSet.version,
          payload: {
            departmentId:
              changeSet.payload.departmentId,
            name,
            code,
            description,
            parentDepartmentId,
          },
        })


      if (!result.success) {
        toast.error(result.message)
        return
      }


      toast.success(result.message)

      router.refresh()

      onSuccess?.()
    })
  }


  return (
    <form
      action={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="department-create-edit-name">
          Nome do departamento
        </Label>

        <Input
          id="department-create-edit-name"
          name="name"
          defaultValue={
            changeSet.payload.name
          }
          maxLength={120}
          disabled={isPending}
          required
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="department-create-edit-code">
          Código
        </Label>

        <Input
          id="department-create-edit-code"
          name="code"
          defaultValue={
            changeSet.payload.code ?? ""
          }
          maxLength={50}
          disabled={isPending}
        />
      </div>


      <ProjectedDepartmentSelector
        id="department-create-edit-parent"
        name="parentDepartmentId"
        label="Departamento superior"
        departments={departments}
        defaultValue={
          changeSet.payload.parentDepartmentId ??
          ""
        }
        allowNoDepartment
        disabled={isPending}
        description="Selecione o departamento superior desta nova unidade."
      />


      <div className="space-y-2">
        <Label htmlFor="department-create-edit-description">
          Descrição
        </Label>

        <textarea
          id="department-create-edit-description"
          name="description"
          className={textareaClassName}
          defaultValue={
            changeSet.payload.description ??
            ""
          }
          maxLength={500}
          disabled={isPending}
        />
      </div>


      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Voltar
        </Button>


        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : "Salvar alteração"}
        </Button>
      </div>
    </form>
  )
}