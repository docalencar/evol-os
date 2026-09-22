"use client"

import { MoreHorizontal } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { PlanningTimelineItemViewModel } from "../../timeline"

type Operation = "rename" | "duplicate" | "delete" | "submit" | "approve" | "reject" | "revise"

export function ScenarioOperationsMenu({ item, canManage }: { item: PlanningTimelineItemViewModel; canManage: boolean }) {
  const [operation, setOperation] = useState<Operation | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const available: readonly Operation[] = !canManage ? [] : item.status === "draft"
    ? ["rename", "duplicate", "delete", "submit"]
    : item.status === "submitted" ? ["approve", "reject"]
      : item.status === "rejected" ? ["revise"] : []

  function submit(formData: FormData) {
    if (!operation) return
    startTransition(async () => {
      const common = { scenarioId: item.id, expectedVersion: item.version }
      const result = operation === "rename"
        ? await (await import("../../actions/rename-scenario-action")).renameScenarioAction({ ...common, name: String(formData.get("name") ?? "") })
        : operation === "duplicate"
          ? await (await import("../../actions/duplicate-scenario-action")).duplicateScenarioAction({ sourceScenarioId: item.id, scenarioId: crypto.randomUUID() })
          : operation === "delete"
            ? await (await import("../../actions/delete-scenario-action")).deleteScenarioAction(common)
            : await (await import("../../actions/transition-scenario-action")).transitionScenarioAction({
              ...common, transition: operation, idempotencyKey: crypto.randomUUID(),
              reason: operation === "reject" ? String(formData.get("reason") ?? "") : null,
            })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setOperation(null)
    })
  }

  return (
    <>
      {available.length > 0 ? <div className="relative ml-auto">
        <Button type="button" variant="outline" size="sm" aria-label={`Operações de ${item.name}`} onClick={() => setMenuOpen((value) => !value)}>
          <MoreHorizontal aria-hidden="true" className="size-4" /> Operações
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {available.map((value) => (
              <button key={value} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100" onClick={() => { setOperation(value); setMenuOpen(false) }}>
                {labels[value]}
              </button>
            ))}
          </div>
        ) : null}
      </div> : null}

      <Dialog open={operation !== null} onOpenChange={(open) => { if (!open && !isPending) setOperation(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{operation ? labels[operation] : "Operação"}</DialogTitle>
            <DialogDescription>{operation ? descriptions[operation] : ""}</DialogDescription>
          </DialogHeader>
          <form action={submit}>
            {operation === "rename" ? (
              <div className="space-y-2">
                <Label htmlFor={`scenario-name-${item.id}`}>Nome</Label>
                <Input id={`scenario-name-${item.id}`} name="name" defaultValue={item.name} minLength={2} maxLength={120} required disabled={isPending} />
              </div>
            ) : null}
            {operation === "reject" ? (
              <div className="space-y-2">
                <Label htmlFor={`rejection-reason-${item.id}`}>Motivo privado da rejeição</Label>
                <Textarea id={`rejection-reason-${item.id}`} name="reason" minLength={1} maxLength={500} required disabled={isPending} />
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setOperation(null)}>Cancelar</Button>
              <Button type="submit" variant={operation === "delete" ? "destructive" : "default"} disabled={isPending}>
                {isPending ? "Processando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

const labels: Record<Operation, string> = {
  rename: "Renomear cenário", duplicate: "Duplicar cenário", delete: "Excluir cenário",
  submit: "Enviar para aprovação", approve: "Aprovar cenário", reject: "Rejeitar cenário", revise: "Revisar rascunho",
}
const descriptions: Record<Operation, string> = {
  rename: "Atualize o nome deste cenário.",
  duplicate: "Crie uma nova branch a partir deste cenário.",
  delete: "O cenário e seus Change Sets serão excluídos permanentemente.",
  submit: "O cenário ficará bloqueado para edição enquanto aguarda decisão.",
  approve: "O cenário ficará elegível para publicação.",
  reject: "O motivo ficará registrado no histórico privado e imutável.",
  revise: "O cenário rejeitado voltará a rascunho para revisão.",
}
