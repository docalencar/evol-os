"use client"

import {
  useState,
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

import type {
  TeamUpdateChangeSet,
} from "../../change-sets"


type TeamUpdateEditFormProps = {
  changeSet: TeamUpdateChangeSet
  scenarioId: string
  onCancel?: () => void
  onSuccess?: () => void
}


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


export function TeamUpdateEditForm({
  changeSet,
  scenarioId,
  onCancel,
  onSuccess,
}: TeamUpdateEditFormProps) {
  const router = useRouter()

  const [
    name,
    setName,
  ] = useState(
    changeSet.payload.name ?? ""
  )

  const [
    code,
    setCode,
  ] = useState(
    changeSet.payload.code ?? ""
  )

  const [
    description,
    setDescription,
  ] = useState(
    changeSet.payload.description ?? ""
  )

  const [
    departmentId,
    setDepartmentId,
  ] = useState(
    changeSet.payload.departmentId ?? ""
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()


  function handleSubmit() {
    startTransition(async () => {
      const result =
        await updatePlanningChangeSetAction({
          scenarioId,
          changeSetId: changeSet.id,
          expectedVersion: changeSet.version,
          changeType: "team.update",
          payload: {
            teamId:
              changeSet.payload.teamId,
            name,
            code,
            description,
            departmentId,
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
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="planning-team-update-name">
          Nome do time
        </Label>

        <Input
          id="planning-team-update-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Ex.: Comercial"
          minLength={2}
          maxLength={120}
          disabled={isPending}
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="planning-team-update-code">
          Código
        </Label>

        <Input
          id="planning-team-update-code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value)
          }
          placeholder="Ex.: COM"
          maxLength={50}
          disabled={isPending}
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="planning-team-update-department">
          Departamento
        </Label>

        <Input
          id="planning-team-update-department"
          value={departmentId}
          onChange={(event) =>
            setDepartmentId(event.target.value)
          }
          disabled={isPending}
        />
      </div>


      <div className="space-y-2">
        <Label htmlFor="planning-team-update-description">
          Descrição
        </Label>

        <textarea
          id="planning-team-update-description"
          className={textareaClassName}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
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
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending
            ? "Salvando alteração..."
            : "Atualizar time"}
        </Button>
      </div>
    </div>
  )
}