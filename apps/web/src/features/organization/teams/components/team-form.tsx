"use client"

import {
  useEffect,
  useState,
  useTransition,
} from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  createTeamAction,
} from "../actions/create-team-action"

import {
  getTeamDepartmentOptionsAction,
  type TeamDepartmentOption,
} from "../actions/get-team-department-options-action"

import {
  updateTeamAction,
} from "../actions/update-team-action"

type TeamFormTeam = {
  id: string
  name: string
  description: string | null
  department_id?: string | null
}

type TeamFormProps = {
  companyId: string
  team?: TeamFormTeam | null
  onSuccess?: () => void
}

const SELECT_CLASS_NAME =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function TeamForm({
  companyId,
  team,
  onSuccess,
}: TeamFormProps) {
  const [
    isPending,
    startTransition,
  ] = useTransition()

  const [
    isLoadingDepartments,
    setIsLoadingDepartments,
  ] = useState(true)

  const [
    departments,
    setDepartments,
  ] = useState<
    TeamDepartmentOption[]
  >([])

  const isEditing = Boolean(team)

  useEffect(() => {
    let isMounted = true

    async function loadDepartments() {
      setIsLoadingDepartments(true)

      const result =
        await getTeamDepartmentOptionsAction(
          companyId
        )

      if (!isMounted) {
        return
      }

      setDepartments(result.options)
      setIsLoadingDepartments(false)

      if (!result.success) {
        toast.error(result.message)
      }
    }

    void loadDepartments()

    return () => {
      isMounted = false
    }
  }, [companyId])

  function handleSubmit(
    formData: FormData
  ) {
    const departmentId =
      String(
        formData.get(
          "departmentId"
        ) ?? ""
      ) || null

    const input = {
      name: String(
        formData.get("name") ?? ""
      ),

      description: String(
        formData.get(
          "description"
        ) ?? ""
      ),

      departmentId,

      parentTeamId: null,
      leaderId: null,
    }

    startTransition(async () => {
      const result = team
        ? await updateTeamAction(
            companyId,
            team.id,
            input
          )
        : await createTeamAction(
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
    <form
      action={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">
          Nome
        </Label>

        <Input
          id="name"
          name="name"
          placeholder="Ex: Atendimento"
          defaultValue={
            team?.name ?? ""
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Descrição
        </Label>

        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste time."
          defaultValue={
            team?.description ?? ""
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departmentId">
          Departamento
        </Label>

        <select
          id="departmentId"
          name="departmentId"
          className={
            SELECT_CLASS_NAME
          }
          defaultValue={
            team?.department_id ?? ""
          }
          disabled={
            isLoadingDepartments
          }
        >
          <option value="">
            Sem departamento
          </option>

          {departments.map(
            (department) => (
              <option
                key={
                  department.value
                }
                value={
                  department.value
                }
              >
                {department.label}
              </option>
            )
          )}
        </select>

        <p className="text-xs text-slate-500">
          Define a qual departamento este time pertence.
        </p>

        {!isLoadingDepartments &&
        departments.length === 0 ? (
          <p className="text-xs text-amber-700">
            Nenhum departamento cadastrado. O time poderá ser salvo sem departamento.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={
            isPending ||
            isLoadingDepartments
          }
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar time"}
        </Button>
      </div>
    </form>
  )
}
