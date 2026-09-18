import { PageHeader } from "@/components/shared/page-header"
import {
  CreateDevelopmentTemplateDialog,
  DevelopmentTemplateTable,
} from "@/features/development/templates"
import { getDevelopmentTemplateAuthoringVersions } from "@/features/development/templates"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { GlobalCompetencyMappingPanel, getPublishedGlobalCompetencies, getTenantCompetencyMappings } from "@/features/development/global-competencies"

export default async function DevelopmentTemplatesPage() {
  const { companyId } = await getCurrentCompanyContext()

  // The authoring boundary answers for administrative actors only and returns
  // drafts, published and obsolete versions alike. A manager or employee gets an
  // empty list here rather than a filtered one — template ADMINISTRATION is not
  // the same capability as seeing published templates in order to apply them.
  const authoringVersions = await getDevelopmentTemplateAuthoringVersions(companyId)

  // One row per container: the newest version is the one the authoring surface
  // is about, and `getDevelopmentTemplateAuthoringVersions` already ordered them.
  const templates = authoringVersions.filter(
    (version, index, all) =>
      all.findIndex((candidate) => candidate.templateId === version.templateId) === index
  )
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
