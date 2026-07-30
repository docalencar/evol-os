import Link from "next/link"

import { Button } from "@/components/ui/button"

export function ExecutiveNavigation({ scenarioId, workspaceId }: { scenarioId: string; workspaceId: string }) {
  return <nav aria-label="Navegação executiva" className="flex flex-wrap gap-2 print:hidden"><Button variant="outline" render={<Link href={`/app/organization/planning/${scenarioId}`} />}>Planejamento</Button><Button variant="outline" render={<Link href={`/app/organization/planning/timeline?workspaceId=${workspaceId}`} />}>Timeline</Button><Button render={<Link href={`/app/organization/planning/${scenarioId}/executive`} />}>Visão executiva</Button></nav>
}
