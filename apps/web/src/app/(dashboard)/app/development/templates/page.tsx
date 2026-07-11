import { PageHeader } from "@/components/shared/page-header"
import { getDevelopmentTemplates } from "@/features/development/templates"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function DevelopmentTemplatesPage() {
  const { companyId } = await getCurrentCompanyContext()

  const templates = await getDevelopmentTemplates(companyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de desenvolvimento"
        description="Crie e reutilize modelos para acelerar a construção de planos de desenvolvimento."
      />

      <pre className="overflow-x-auto rounded-lg border bg-slate-50 p-4 text-xs text-slate-700">
        {JSON.stringify(templates, null, 2)}
      </pre>
    </div>
  )
}
