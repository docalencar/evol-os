"use client"

import { useState } from "react"

import {
  ProductWizard,
  ProductWizardActions,
  ProductWizardFooter,
  ProductWizardProgress,
  ProductWizardStep,
  type ProductWizardStepDefinition,
} from "@/components/product/wizard"
import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

const jobOpeningSteps: ProductWizardStepDefinition[] = [
  {
    id: "1-reason",
    title: "Motivo da vaga",
    description:
      "Defina o contexto que originou a necessidade da vaga.",
  },
  {
    id: "2-organization",
    title: "Estrutura organizacional",
    description:
      "Identifique onde a vaga estará posicionada na organização.",
  },
  {
    id: "3-owners",
    title: "Responsáveis",
    description:
      "Indique quem participará da condução da vaga.",
  },
  {
    id: "4-details",
    title: "Detalhes",
    description:
      "Organize as principais informações da oportunidade.",
  },
  {
    id: "5-review",
    title: "Revisão",
    description:
      "Revise as informações antes de concluir o preenchimento.",
  },
]

export function JobOpeningCreateWizard() {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className="w-full xl:w-auto">
          Nova vaga
        </Button>
      }
      title="Nova vaga"
      description="Siga as etapas para organizar a criação de uma vaga."
      contentClassName="max-w-4xl"
      bodyClassName="overflow-y-auto"
    >
      <ProductWizard
        key={open ? "open" : "closed"}
        steps={jobOpeningSteps}
      >
        <div className="pb-5">
          <ProductWizardProgress />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-1">
          {jobOpeningSteps.map((step) => (
            <ProductWizardStep
              key={step.id}
              id={step.id}
              title={step.title}
            >
              <div className="min-h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6">
                <h3 className="text-base font-semibold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            </ProductWizardStep>
          ))}
        </div>

        <ProductWizardFooter>
          <ProductWizardActions
            onCancel={() => setOpen(false)}
            nextLabel="Próximo"
            completeLabel="Próximo"
          />
        </ProductWizardFooter>
      </ProductWizard>
    </EntityDialog>
  )
}
