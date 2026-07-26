"use client"

import {
  Pencil,
} from "lucide-react"

import {
  useState,
} from "react"

import {
  Button,
} from "@/components/ui/button"

import {
  EntityDialog,
} from "@/components/shared/entity-dialog"

import type {
  PlanningChangeSet,

  DepartmentCreateChangeSet,
  DepartmentUpdateChangeSet,
  DepartmentArchiveChangeSet,

  TeamCreateChangeSet,
  TeamUpdateChangeSet,
  TeamArchiveChangeSet,
} from "../../change-sets"

import type {
  ProjectedDepartmentSelectorOption,
} from "../selectors"

import {
  DepartmentCreateEditForm,
} from "./department-create-edit-form"

import {
  DepartmentUpdateEditForm,
} from "./department-update-edit-form"

import {
  DepartmentArchiveEditForm,
} from "./department-archive-edit-form"

import {
  TeamCreateEditForm,
} from "./team-create-edit-form"

import {
  TeamUpdateEditForm,
} from "./team-update-edit-form"

import {
  TeamArchiveEditForm,
} from "./team-archive-edit-form"


type ChangeSetEditDialogProps = Readonly<{
  changeSet: PlanningChangeSet
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
}>


function getTitle(
  changeSet: PlanningChangeSet
) {
  switch (changeSet.changeType) {
    case "department.create":
      return "Editar criação de departamento"

    case "department.update":
      return "Editar atualização de departamento"

    case "department.archive":
      return "Editar arquivamento de departamento"

    case "team.create":
      return "Editar criação de time"

    case "team.update":
      return "Editar atualização de time"

    case "team.archive":
      return "Editar arquivamento de time"

    default:
      return "Editar alteração"
  }
}


function getDescription(
  changeSet: PlanningChangeSet
) {
  switch (changeSet.changeType) {
    case "department.create":
      return "Revise os dados desta alteração planejada."

    case "department.update":
      return "Atualize os dados simulados desta alteração."

    case "department.archive":
      return "Revise o arquivamento planejado."

    case "team.create":
      return "Revise os dados desta criação de time."

    case "team.update":
      return "Atualize os dados simulados deste time."

    case "team.archive":
      return "Revise o arquivamento planejado deste time."

    default:
      return "Edite os dados desta alteração."
  }
}


function ChangeSetEditContent({
  changeSet,
  scenarioId,
  departments,
  onSuccess,
  onCancel,
}: {
  changeSet: PlanningChangeSet
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  onSuccess: () => void
  onCancel: () => void
}) {
  switch (changeSet.changeType) {
    case "department.create":
      return (
        <DepartmentCreateEditForm
          changeSet={
            changeSet as DepartmentCreateChangeSet
          }
          scenarioId={scenarioId}
          departments={departments}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    case "department.update":
      return (
        <DepartmentUpdateEditForm
          changeSet={
            changeSet as DepartmentUpdateChangeSet
          }
          scenarioId={scenarioId}
          departments={departments}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    case "department.archive":
      return (
        <DepartmentArchiveEditForm
          changeSet={
            changeSet as DepartmentArchiveChangeSet
          }
          scenarioId={scenarioId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    case "team.create":
      return (
        <TeamCreateEditForm
          changeSet={
            changeSet as TeamCreateChangeSet
          }
          scenarioId={scenarioId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    case "team.update":
      return (
        <TeamUpdateEditForm
          changeSet={
            changeSet as TeamUpdateChangeSet
          }
          scenarioId={scenarioId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    case "team.archive":
      return (
        <TeamArchiveEditForm
          changeSet={
            changeSet as TeamArchiveChangeSet
          }
          scenarioId={scenarioId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      )

    default:
      return (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este tipo de alteração ainda não possui edição.
        </div>
      )
  }
}


export function ChangeSetEditDialog({
  changeSet,
  scenarioId,
  departments,
}: ChangeSetEditDialogProps) {
  const [
    open,
    setOpen,
  ] = useState(false)


  function handleSuccess() {
    setOpen(false)
  }


  function handleCancel() {
    setOpen(false)
  }


  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      }
      title={getTitle(changeSet)}
      description={getDescription(changeSet)}
      contentClassName="sm:max-w-2xl"
    >
      <ChangeSetEditContent
        changeSet={changeSet}
        scenarioId={scenarioId}
        departments={departments}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </EntityDialog>
  )
}