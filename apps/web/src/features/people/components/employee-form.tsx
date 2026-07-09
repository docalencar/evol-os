"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createEmployeeAction } from "../actions/create-employee-action"
import { updateEmployeeAction } from "../actions/update-employee-action"
import type { Employee } from "../types/employee"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeFormProps = {
  companyId: string
  employee?: Employee
  teams?: EmployeeSelectOption[]
  positions?: EmployeeSelectOption[]
  managers?: EmployeeSelectOption[]
  onSuccess?: () => void
}

export function EmployeeForm({
  companyId,
  employee,
  teams = [],
  positions = [],
  managers = [],
  onSuccess,
}: EmployeeFormProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(employee)

  const availableManagers = managers.filter(
    (manager) => manager.id !== employee?.id
  )

  function handleSubmit(formData: FormData) {
    const input = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      hireDate: String(formData.get("hireDate") ?? ""),
      status: String(formData.get("status") ?? "active"),
      teamId: String(formData.get("teamId") ?? ""),
      positionId: String(formData.get("positionId") ?? ""),
      managerId: String(formData.get("managerId") ?? ""),
    }

    startTransition(async () => {
      const result = employee
        ? await updateEmployeeAction(companyId, employee.id, input)
        : await createEmployeeAction(companyId, input)

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
        <Label htmlFor="fullName">Nome completo</Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder="Ex: Ana Bezerra"
          defaultValue={employee?.full_name ?? ""}
          required
        />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ana@empresa.com"
          defaultValue={employee?.email ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="(85) 99999-9999"
          defaultValue={employee?.phone ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="teamId">Time</Label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={employee?.team_id ?? ""}
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Sem time</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="positionId">Cargo</Label>
        <select
          id="positionId"
          name="positionId"
          defaultValue={employee?.position_id ?? ""}
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Sem cargo</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="managerId">Gestor</Label>
        <select
          id="managerId"
          name="managerId"
          defaultValue={employee?.manager_id ?? ""}
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Sem gestor</option>
          {availableManagers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="hireDate">Data de admissão</Label>
        <Input
          id="hireDate"
          name="hireDate"
          type="date"
          defaultValue={employee?.hire_date ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="birthDate">Data de nascimento</Label>
        <Input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={employee?.birth_date ?? ""}
        />
      </div>

      <input type="hidden" name="status" value={employee?.status ?? "active"} />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar colaborador"}
        </Button>
      </div>
    </form>
  )
}
