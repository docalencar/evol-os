import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import {
  PlanningScenarioHeader,
  PlanningScenarioWorkspace,
} from "@/features/organization-planning/components"
import { getPlanningScenario } from "@/features/organization-planning/queries/get-planning-scenario"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { cn } from "@/lib/utils"

type OrganizationScenarioPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function OrganizationScenarioPage({
  params,
}: OrganizationScenarioPageProps) {
  const { id } = await params

  const { companyId } =
    await getCurrentCompanyContext()

  const planning =
    await getPlanningScenario(companyId, id)

  if (!planning) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/app/organization"
          className={cn(
            "-ml-3 inline-flex h-9 items-center justify-center",
            "rounded-md px-3 text-sm font-medium",
            "transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-ring",
            "focus-visible:ring-offset-2"
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao planejamento
        </Link>
      </div>

      <PlanningScenarioHeader
        planning={planning}
      />

      <PlanningScenarioWorkspace
        planning={planning}
      />
    </div>
  )
}
