import Link from "next/link"

import { DashboardCard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { ExecutiveExportButton } from "./executive-export-button"

export function ExecutiveActionPanel({ scenarioId, workspaceId }: { scenarioId: string; workspaceId: string }) {
  return <DashboardCard title="Ações executivas" description="Acesse as capacidades oficiais do Planning."><div className="flex flex-wrap gap-2"><Button variant="outline" nativeButton={false} render={<Link href={`/app/organization/planning/${scenarioId}`} />}>Abrir cenário</Button><Button variant="outline" nativeButton={false} render={<Link href={`/app/organization/planning/timeline?workspaceId=${workspaceId}`} />}>Ver histórico</Button><ExecutiveExportButton /></div></DashboardCard>
}
