"use client"

import {
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  CheckCircle2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import {
  ProductWizard,
  ProductWizardActions,
  ProductWizardFooter,
  ProductWizardHelp,
  ProductWizardProgress,
  ProductWizardStep,
  ProductWizardSummary,
  useProductWizard,
  type ProductWizardStepDefinition,
} from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createCompanyAction } from "../actions/create-company-action"

const onboardingSteps: ProductWizardStepDefinition[] = [
  {
    id: "company",
    title: "Sua empresa",
    description:
      "Informe como sua organização será identificada no Evol OS.",
  },
  {
    id: "review",
    title: "Revisão",
    description:
      "Confira os dados antes de criar o espaço da empresa.",
  },
]

export function CompanyOnboardingForm() {
  const router = useRouter()

  const [companyName, setCompanyName] =
    useState("")

  const [isPending, startTransition] =
    useTransition()

  function handleComplete() {
    const normalizedCompanyName =
      companyName.trim()

    if (normalizedCompanyName.length < 2) {
      toast.error(
        "Informe o nome da empresa com pelo menos 2 caracteres."
      )
      return
    }

    startTransition(async () => {
      const result =
        await createCompanyAction({
          name: normalizedCompanyName,
        })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(
        "Empresa criada com sucesso."
      )

      router.push("/app")
      router.refresh()
    })
  }

  return (
    <div className="mt-8">
      <ProductWizard
        steps={onboardingSteps}
        onComplete={handleComplete}
      >
        <div className="pb-5">
          <ProductWizardProgress />
        </div>

        <div className="space-y-3">
          <ProductWizardStep
            id="company"
            title="Identificação da empresa"
            description="Use o nome pelo qual sua organização é conhecida."
            summary={
              <ProductWizardSummary>
                {companyName.trim() ||
                  "Nome ainda não informado"}
              </ProductWizardSummary>
            }
          >
            <CompanyIdentificationStep
              companyName={companyName}
              onCompanyNameChange={
                setCompanyName
              }
            />
          </ProductWizardStep>

          <ProductWizardStep
            id="review"
            title="Revisão"
            description="Confira as informações antes de continuar."
            summary="Empresa pronta para criação"
          >
            <CompanyOnboardingReview
              companyName={companyName}
            />
          </ProductWizardStep>
        </div>

        <CompanyOnboardingFooter
          companyName={companyName}
          isPending={isPending}
        />
      </ProductWizard>
    </div>
  )
}

type CompanyIdentificationStepProps = {
  companyName: string
  onCompanyNameChange: (
    value: string
  ) => void
}

function CompanyIdentificationStep({
  companyName,
  onCompanyNameChange,
}: CompanyIdentificationStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="company-name">
          Nome da empresa
        </Label>

        <Input
          id="company-name"
          name="companyName"
          placeholder="Ex.: Evol Tecnologia"
          value={companyName}
          onChange={(event) =>
            onCompanyNameChange(
              event.target.value
            )
          }
          autoComplete="organization"
          minLength={2}
          maxLength={120}
          autoFocus
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Esse nome aparecerá no ambiente da empresa,
          nos cadastros e nos relatórios.
        </p>
      </div>

      <ProductWizardHelp label="Você poderá alterar depois">
        O nome da organização poderá ser atualizado
        posteriormente nas configurações da empresa.
      </ProductWizardHelp>
    </div>
  )
}

function CompanyOnboardingReview({
  companyName,
}: {
  companyName: string
}) {
  const normalizedCompanyName =
    companyName.trim()

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Tudo pronto para começar
            </p>

            <p className="text-sm leading-6 text-muted-foreground">
              Ao concluir, criaremos o espaço da
              organização e você será direcionado ao
              painel principal.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome da empresa
            </p>

            <p className="break-words text-base font-semibold">
              {normalizedCompanyName ||
                "Nome não informado"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

        <div className="space-y-1">
          <p className="text-sm font-medium">
            Próximos passos
          </p>

          <p className="text-sm leading-6 text-muted-foreground">
            Depois da criação, você poderá cadastrar
            departamentos, times, cargos e pessoas da
            organização.
          </p>
        </div>
      </div>
    </div>
  )
}

type CompanyOnboardingFooterProps = {
  companyName: string
  isPending: boolean
}

function CompanyOnboardingFooter({
  companyName,
  isPending,
}: CompanyOnboardingFooterProps) {
  const { currentStepId } =
    useProductWizard()

  function validateCurrentStep() {
    if (
      currentStepId === "company" &&
      companyName.trim().length < 2
    ) {
      toast.error(
        "Informe o nome da empresa com pelo menos 2 caracteres."
      )

      return false
    }

    if (companyName.trim().length > 120) {
      toast.error(
        "O nome da empresa deve possuir no máximo 120 caracteres."
      )

      return false
    }

    return true
  }

  return (
    <ProductWizardFooter>
      <ProductWizardActions
        onBeforeNext={
          validateCurrentStep
        }
        onBeforeComplete={
          validateCurrentStep
        }
        completeLabel="Criar empresa e continuar"
        isPending={isPending}
      />
    </ProductWizardFooter>
  )
}
