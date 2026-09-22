"use client"

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { PlanningContentEditorViewModel } from "../../application"

/**
 * The content actions are loaded on demand, not imported at module scope.
 *
 * `actions/index.ts` re-exports every planning server action, and those pull in
 * `current-company` and therefore `server-only`. Importing the barrel from a
 * client component drags that whole chain into the module graph, which Next
 * tolerates but any non-Next renderer cannot resolve. `publication-wizard.tsx`
 * already loads its action this way; this follows that convention.
 */
const contentActions = () => import("../../actions/planning-content-actions")

type ActionResultLike = Readonly<{ success: boolean; message: string }>

type PlanningContentEditorProps = Readonly<{
  scenarioId: string
  expectedVersion: number
  canManage: boolean
  content: PlanningContentEditorViewModel
}>

export function PlanningContentEditor({
  scenarioId,
  expectedVersion,
  canManage,
  content,
}: PlanningContentEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function complete(result: ActionResultLike) {
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    router.refresh()
  }

  function create(formData: FormData) {
    startTransition(async () => complete(await (await contentActions()).createPlanningDepartmentAction({
      scenarioId,
      expectedVersion,
      changeSetId: crypto.randomUUID(),
      content: readDepartmentContent(formData, crypto.randomUUID()),
    })))
  }

  function replace(changeSetId: string, departmentId: string, formData: FormData) {
    startTransition(async () => complete(await (await contentActions()).replacePlanningDepartmentAction({
      scenarioId,
      expectedVersion,
      currentChangeSetId: changeSetId,
      replacementChangeSetId: crypto.randomUUID(),
      content: readDepartmentContent(formData, departmentId),
    })))
  }

  function remove(changeSetId: string) {
    startTransition(async () => complete(await (await contentActions()).removePlanningChangeSetAction({
      scenarioId,
      expectedVersion,
      changeSetId,
    })))
  }

  function move(changeSetId: string, offset: -1 | 1) {
    const currentIndex = content.changeSets.findIndex((changeSet) => changeSet.id === changeSetId)
    const destination = currentIndex + offset
    if (currentIndex < 0 || destination < 0 || destination >= content.changeSets.length) return
    const orderedChangeSetIds = content.changeSets.map((changeSet) => changeSet.id)
    ;[orderedChangeSetIds[currentIndex], orderedChangeSetIds[destination]] = [
      orderedChangeSetIds[destination]!,
      orderedChangeSetIds[currentIndex]!,
    ]
    startTransition(async () => complete(await (await contentActions()).reorderPlanningChangeSetsAction({
      scenarioId,
      expectedVersion,
      orderedChangeSetIds,
    })))
  }

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="planning-content-title">
      <div>
        <h2 id="planning-content-title" className="text-lg font-semibold text-slate-900">Conteúdo do cenário</h2>
        <p className="mt-1 text-sm text-slate-600">Crie departamentos no rascunho e confira o impacto projetado antes de enviar.</p>
      </div>

      {canManage ? (
        <form action={create} className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
          <DepartmentFields prefix="new" disabled={isPending} />
          <div className="md:col-span-2"><Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Adicionar departamento"}</Button></div>
        </form>
      ) : (
        <p className="text-sm text-slate-600">Você pode acompanhar o conteúdo, mas não possui permissão para editá-lo.</p>
      )}

      <div className="space-y-3">
        <h3 className="font-medium text-slate-900">Alterações ativas</h3>
        {content.changeSets.length === 0 ? <p className="text-sm text-slate-500">Nenhum departamento adicionado.</p> : null}
        {content.changeSets.map((changeSet, index) => (
          <article key={changeSet.id} className="rounded-lg border border-slate-200 p-4">
            {canManage ? (
              <form action={(formData) => replace(changeSet.id, changeSet.departmentId, formData)} className="grid gap-4 md:grid-cols-2">
                <DepartmentFields prefix={changeSet.id} disabled={isPending} initial={changeSet} />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button type="submit" variant="outline" disabled={isPending}>Salvar edição</Button>
                  <Button type="button" variant="outline" disabled={isPending || index === 0} onClick={() => move(changeSet.id, -1)} aria-label={`Mover ${changeSet.name} para cima`}><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="outline" disabled={isPending || index === content.changeSets.length - 1} onClick={() => move(changeSet.id, 1)} aria-label={`Mover ${changeSet.name} para baixo`}><ArrowDown className="size-4" /></Button>
                  <Button type="button" variant="destructive" disabled={isPending} onClick={() => remove(changeSet.id)}><Trash2 className="mr-2 size-4" />Remover</Button>
                </div>
              </form>
            ) : (
              <p className="font-medium text-slate-900">{changeSet.name}{changeSet.code ? ` · ${changeSet.code}` : ""}</p>
            )}
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-950">Prévia de impacto</h3>
        <p className="mt-1 text-sm text-blue-800">A projeção contém {content.projectedDepartments.length} departamento(s) criado(s) neste cenário.</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-blue-900">
          {content.projectedDepartments.map((department) => <li key={department.id}>{department.name}{department.code ? ` (${department.code})` : ""}</li>)}
        </ul>
      </div>
    </section>
  )
}

type DepartmentFieldsProps = Readonly<{
  prefix: string
  disabled: boolean
  initial?: PlanningContentEditorViewModel["changeSets"][number]
}>

function DepartmentFields({ prefix, disabled, initial }: DepartmentFieldsProps) {
  return <>
    <div className="space-y-2"><Label htmlFor={`${prefix}-department-name`}>Nome</Label><Input id={`${prefix}-department-name`} name="name" defaultValue={initial?.name} minLength={2} maxLength={120} required disabled={disabled} /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-department-code`}>Código</Label><Input id={`${prefix}-department-code`} name="code" defaultValue={initial?.code ?? ""} maxLength={40} disabled={disabled} /></div>
    <div className="space-y-2 md:col-span-2"><Label htmlFor={`${prefix}-department-description`}>Descrição</Label><Textarea id={`${prefix}-department-description`} name="description" defaultValue={initial?.description ?? ""} maxLength={500} disabled={disabled} /></div>
    <div className="space-y-2 md:col-span-2"><Label htmlFor={`${prefix}-department-parent`}>ID do departamento pai (opcional)</Label><Input id={`${prefix}-department-parent`} name="parentDepartmentId" defaultValue={initial?.parentDepartmentId ?? ""} disabled={disabled} /></div>
  </>
}

function readDepartmentContent(formData: FormData, departmentId: string) {
  return {
    departmentId,
    name: String(formData.get("name") ?? ""),
    code: nullableFormValue(formData.get("code")),
    description: nullableFormValue(formData.get("description")),
    parentDepartmentId: nullableFormValue(formData.get("parentDepartmentId")),
  }
}

function nullableFormValue(value: FormDataEntryValue | null): string | null {
  const normalized = String(value ?? "").trim()
  return normalized.length > 0 ? normalized : null
}
