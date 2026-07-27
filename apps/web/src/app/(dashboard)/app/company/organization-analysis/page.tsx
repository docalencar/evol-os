import { PageHeader } from "@/components/shared/page-header"

import {
  getDepartments,
} from "@/features/organization/departments"

import {
  analyzeOrganizationClassification,
} from "@/features/organization/structure"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  OrganizationProposalButton,
} from "@/features/organization-planning/proposals"

function SeverityBadge({
  severity,
}: {
  severity: "low" | "medium" | "high"
}) {
  const labels = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
  }

  return (
    <span
      className="
        rounded-full
        border
        px-3
        py-1
        text-xs
        font-medium
      "
    >
      Impacto: {labels[severity]}
    </span>
  )
}


export default async function OrganizationAnalysisPage() {
  const {
    companyId,
  } =
    await getCurrentCompanyContext()


  const departments =
    await getDepartments(companyId)


  const insight =
    analyzeOrganizationClassification(
      departments
    )


  return (
    <div className="space-y-6">

      <PageHeader
        title="Análise da organização"
        description="
          Identifique oportunidades de melhoria
          na estrutura organizacional.
        "
      />


      <section
        className="
          rounded-2xl
          border
          bg-card
          p-6
        "
      >

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >

          <div>

            <h2 className="text-xl font-semibold">
              Diagnóstico estrutural
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              O Evol OS analisou os registros atuais
              da organização.
            </p>

          </div>


          <SeverityBadge
            severity={insight.severity}
          />

        </div>


        <p className="mt-6 text-sm">
          {insight.message}
        </p>


        <h3 className="mt-6 font-semibold">
          Possíveis unidades organizacionais
        </h3>


        <ul
          className="
            mt-3
            list-disc
            space-y-1
            pl-5
            text-sm
          "
        >

          {insight.suggestedUnits.map(
            (unit) => (
              <li key={unit}>
                {unit}
              </li>
            )
          )}

        </ul>


        <OrganizationProposalButton
          companyId={companyId}
          suggestedUnits={insight.suggestedUnits}
        />


      </section>

    </div>
  )
}
