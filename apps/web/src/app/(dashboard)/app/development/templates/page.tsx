import { PageHeader } from "@/components/shared/page-header"
import {
  CreateDevelopmentTemplateDialog,
  DevelopmentTemplateTable,
  getDevelopmentTemplates,
} from "@/features/development/templates"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { GlobalCompetencyMappingPanel, getPublishedGlobalCompetencies, getTenantCompetencyMappings } from "@/features/development/global-competencies"

export default async function DevelopmentTemplatesPage() {
  const { companyId } = await getCurrentCompanyContext()

  const templates = await getDevelopmentTemplates(companyId)
  const [concepts, mappings] = await Promise.all([getPublishedGlobalCompetencies(), getTenantCompetencyMappings(companyId)])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de Desenvolvimento"
        description="Crie modelos reutilizáveis para acelerar a criação de planos de desenvolvimento."
        actions={<CreateDevelopmentTemplateDialog />}
      />

      <DevelopmentTemplateTable
        templates={templates}
      />
      <GlobalCompetencyMappingPanel concepts={concepts} mappings={mappings} />
    </div>
  )
}
