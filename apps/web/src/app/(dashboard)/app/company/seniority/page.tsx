import { EntityBackLink } from "@/components/shared/entity-back-link"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import {
  SeniorityLevelCreateDialog,
  SeniorityLevelTable,
  getSeniorityLevels,
} from "@/features/organization/seniority-levels"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function SeniorityLevelsPage() {
  const { companyId } = await getCurrentCompanyContext()

  const seniorityLevels = await getSeniorityLevels(companyId)

  return (
    <div className="space-y-6">
      <EntityBackLink
        href="/app/company"
        label="Voltar para empresa"
      />

      <PageHeader
        title="Senioridades"
        description="Defina os níveis de experiência usados nos cargos da empresa."
        actions={
          <SeniorityLevelCreateDialog companyId={companyId} />
        }
      />

      <Card>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">
            O que é senioridade?
          </h3>

          <p className="text-sm text-slate-600">
            Senioridade indica o grau de experiência e maturidade dentro de um
            cargo — por exemplo Júnior, Pleno, Sênior ou Especialista. Cada
            empresa define a própria estrutura; estes são apenas exemplos.
          </p>

          <p className="text-sm text-slate-600">
            Ela não é o nível hierárquico: senioridade indica maturidade no
            cargo, enquanto o nível hierárquico indica a posição do cargo na
            estrutura organizacional.
          </p>
        </div>
      </Card>

      <SeniorityLevelTable
        companyId={companyId}
        seniorityLevels={seniorityLevels}
      />
    </div>
  )
}
