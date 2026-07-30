"use client"

import { MoreHorizontal } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PlanningTimelineItemViewModel } from "../../timeline"

type Operation = "rename" | "duplicate" | "archive" | "restore" | "delete"

export function ScenarioOperationsMenu({ item }: { item: PlanningTimelineItemViewModel }) {
  const [operation, setOperation] = useState<Operation | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const available: readonly Operation[] = item.status === "archived"
    ? ["restore"]
    : ["rename", "duplicate", "archive", "delete"]

  function submit(formData: FormData) {
    if (!operation) return
    startTransition(async () => {
      const common = { scenarioId: item.id, expectedVersion: item.version }
      const result = operation === "rename"
        ? await (await import("../../actions/rename-scenario-action")).renameScenarioAction({ ...common, name: String(formData.get("name") ?? "") })
        : operation === "duplicate"
          ? await (await import("../../actions/duplicate-scenario-action")).duplicateScenarioAction({ sourceScenarioId: item.id, scenarioId: crypto.randomUUID() })
          : operation === "archive"
            ? await (await import("../../actions/archive-scenario-action")).archiveScenarioAction(common)
            : operation === "restore"
              ? await (await import("../../actions/restore-scenario-action")).restoreScenarioAction(common)
              : await (await import("../../actions/delete-scenario-action")).deleteScenarioAction(common)
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
      <div className="relative ml-auto">
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
      </div>

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
  rename: "Renomear cenário", duplicate: "Duplicar cenário", archive: "Arquivar cenário",
  restore: "Restaurar cenário", delete: "Excluir cenário",
}
const descriptions: Record<Operation, string> = {
  rename: "Atualize o nome deste cenário.",
  duplicate: "Crie uma nova branch a partir deste cenário.",
  archive: "O cenário será preservado e ocultado da Timeline principal.",
  restore: "O cenário voltará ao estado de rascunho.",
  delete: "O cenário e seus Change Sets serão excluídos permanentemente.",
}
