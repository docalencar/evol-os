"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PublicationValidationResult } from "../application"
import { PublicationConfirmStep } from "./publication-confirm-step"
import { PublicationImpactStep } from "./publication-impact-step"
import { PublicationProgress } from "./publication-progress"
import { PublicationResult } from "./publication-result"
import { PublicationSummaryStep } from "./publication-summary-step"
import { PublicationValidationStep } from "./publication-validation-step"

type Props = Readonly<{ scenarioId: string; name: string; status: string; version: number }>

export function PublicationWizard(props: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [validation, setValidation] = useState<PublicationValidationResult | null>(null)
  const [publicationResult, setPublicationResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function openWizard() {
    setOpen(true); setStep(0); setValidation(null); setPublicationResult(null)
    startTransition(async () => {
      const action = await import("../actions/validate-publication-action")
      const result = await action.validatePublicationAction({ scenarioId: props.scenarioId, expectedVersion: props.version })
      if (!result.success || !result.data) { toast.error(result.message); return }
      setValidation(result.data)
    })
  }

  function publish() {
    startTransition(async () => {
      const action = await import("../actions/publish-scenario-action")
      const result = await action.publishScenarioAction({ scenarioId: props.scenarioId, expectedVersion: props.version, snapshotId: crypto.randomUUID() })
      setPublicationResult({ success: result.success, message: result.message })
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <>
      <Button type="button" onClick={openWizard}>Publicar Cenário</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publicação do cenário</DialogTitle><DialogDescription>Valide o cenário antes de criar o Snapshot definitivo.</DialogDescription></DialogHeader>
          <PublicationProgress current={step} />
          <div className="mt-6">
            {publicationResult ? <PublicationResult {...publicationResult} /> : step === 0 ? <PublicationValidationStep status={props.status} validation={validation} /> : step === 1 ? <PublicationSummaryStep name={props.name} version={props.version} /> : step === 2 && validation ? <PublicationImpactStep validation={validation} /> : <PublicationConfirmStep />}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => step === 0 ? setOpen(false) : setStep((value) => value - 1)} disabled={isPending || publicationResult?.success}>Voltar</Button>
            {!publicationResult ? step < 3 ? <Button type="button" onClick={() => setStep((value) => value + 1)} disabled={isPending || !validation?.valid}>Continuar</Button> : <Button type="button" onClick={publish} disabled={isPending || !validation?.valid}>{isPending ? "Publicando…" : "Confirmar publicação"}</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
